import type { Bag, Mode } from '../shared/domain';
let csrf = '';
export type ToolResponse = {
  result: any;
  meta: { mode: Mode; queriedAt: string; traceId?: string; snapshot?: Bag };
  message?: string;
};
export type Session = { csrf: string; mode: Mode; locked: boolean; version: string; snapshot: Bag };
export async function session(): Promise<Session> {
  const res = await fetch('/api/session', { cache: 'no-store' });
  if (!res.ok) throw new Error('无法连接麦游记服务');
  const data = await res.json();
  csrf = data.csrf;
  return data;
}
async function post(path: string, body: Bag, signal?: AbortSignal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-token': csrf },
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ error: '服务返回了无法读取的响应' }));
  if (!res.ok) throw new Error(data.error ?? '请求未成功');
  return data;
}
export const unlock = (key: string) => post('/api/unlock', { key });
export const tool = (name: string, args: Bag = {}, signal?: AbortSignal): Promise<ToolResponse> =>
  post(`/api/tools/${encodeURIComponent(name)}`, { args }, signal);
export const prepare = (name: string, args: Bag) => post('/api/actions/prepare', { name, args });
export const commit = (id: string) => post('/api/actions/commit', { id, confirmed: true });
