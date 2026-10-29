import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Ajv from 'ajv';
import { TOOL_NAMES, type Bag } from '../shared/domain.ts';
export interface Gateway {
  mode: 'live' | 'demo';
  call(name: string, args: Bag): Promise<Bag>;
  close?(): Promise<void>;
}
export function unpack(result: Bag): Bag {
  if (result.isError) throw new Error('MCP 工具执行失败，请稍后重试');
  let body = result.structuredContent;
  if (!body) {
    const text = (result.content ?? [])
      .filter((c: Bag) => c.type === 'text')
      .map((c: Bag) => c.text)
      .join('\n');
    const candidates = [
      text,
      text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1],
      text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
    ];
    for (const c of candidates) {
      if (!c) continue;
      try {
        body = JSON.parse(c);
        break;
      } catch {
        /* next format */
      }
    }
    if (!body) throw new Error('MCP 返回了无法识别的数据格式');
  }
  if (body.success === false || (body.code != null && ![0, 200, '0', '200'].includes(body.code)))
    throw new Error(String(body.message ?? '上游业务请求失败'));
  return body;
}
const canonical = (s: string) =>
  s
    .replace(/^mcp__mcdonald__/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export class LiveGateway implements Gateway {
  mode = 'live' as const;
  private client?: Client;
  private opening?: Promise<void>;
  private toolMap = new Map<string, { name: string; validate: ReturnType<Ajv['compile']> }>();
  constructor(private token: string) {}
  private async connect() {
    if (this.client) return;
    if (this.opening) return this.opening;
    this.opening = (async () => {
      const client = new Client({ name: 'maiyouji', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL('https://mcp.mcd.cn'), {
        requestInit: { headers: { Authorization: `Bearer ${this.token}` } },
      });
      try {
        await client.connect(transport);
        const ajv = new Ajv({ strict: false, allErrors: true });
        let cursor: string | undefined;
        const seen = new Set<string>();
        do {
          const page = await client.listTools(cursor ? { cursor } : {});
          for (const t of page.tools) {
            if (TOOL_NAMES.some((n) => canonical(n) === canonical(t.name)))
              this.toolMap.set(canonical(t.name), {
                name: t.name,
                validate: ajv.compile(t.inputSchema),
              });
          }
          cursor = page.nextCursor;
          if (cursor) {
            if (seen.has(cursor)) throw new Error('工具分页游标重复');
            seen.add(cursor);
          }
        } while (cursor);
        this.client = client;
      } catch {
        await client.close().catch(() => {});
        throw new Error('麦当劳 MCP 连接失败，请检查服务端 Token 与网络');
      }
    })().finally(() => {
      this.opening = undefined;
    });
    return this.opening;
  }
  async call(name: string, args: Bag) {
    await this.connect();
    const t = this.toolMap.get(canonical(name));
    if (!t) throw new Error('当前 MCP 未提供此工具');
    if (!t.validate(args))
      throw new Error(
        `参数不符合 MCP 要求：${(t.validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join('; ')}`,
      );
    // No automatic retry: a timeout does not prove that a mutation failed.
    let result;
    try {
      result = await this.client!.callTool({ name: t.name, arguments: args }, undefined, {
        timeout: 30000,
      });
    } catch {
      throw new Error('MCP 请求未完成；若涉及账户变更，请先查询订单或账户，避免重复提交');
    }
    return unpack(result);
  }
  async close() {
    await this.client?.close();
  }
}
