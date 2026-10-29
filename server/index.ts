import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { LiveGateway, type Gateway } from './mcp.ts';
import { DemoGateway } from './demo.ts';
try {
  process.loadEnvFile();
} catch {
  /* Environment variables may be supplied by the shell instead. */
}
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4317);
const accessKey = process.env.APP_ACCESS_KEY;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!accessKey || accessKey.length < 16))
  throw new Error('开放局域网访问前，请设置至少 16 位的 APP_ACCESS_KEY');
const token = process.env.MCD_MCP_TOKEN?.trim();
const live = token ? new LiveGateway(token) : undefined;
const demos = new Map<string, { g: Gateway; usedAt: number }>();
const getGateway = (sid: string) => {
  if (live) return live;
  const now = Date.now();
  for (const [id, d] of demos) if (now - d.usedAt > 8 * 3600000) demos.delete(id);
  if (!demos.has(sid)) demos.set(sid, { g: new DemoGateway(), usedAt: now });
  const d = demos.get(sid)!;
  d.usedAt = now;
  return d.g;
};
const app = createApp(getGateway, { accessKey, allowLan: host !== '127.0.0.1' });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    next();
  });
  app.use(express.static(path.join(root, 'dist'), { index: false }));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(root, 'dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(port, host, () =>
  console.log(`麦游记 · ${live ? '真实 MCP 模式' : '演示模式'} · http://${host}:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close();
    void live?.close().finally(() => process.exit(0));
    if (!live) process.exit(0);
  });
