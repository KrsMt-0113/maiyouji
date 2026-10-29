import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { TOOL_NAMES, WRITE_TOOLS, validateContext, type Bag } from '../shared/domain.ts';
import type { Gateway } from './mcp.ts';
import { ActionService } from './actions.ts';
import { publicSnapshot } from './demo.ts';
type Session = {
  id: string;
  csrf: string;
  unlocked: boolean;
  usedAt: number;
  window: number;
  calls: number;
  failures: number;
};
export function createApp(
  getGateway: (sid: string) => Gateway,
  options: { accessKey?: string; allowLan?: boolean } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  const sessions = new Map<string, Session>();
  const actions = new ActionService();
  app.use('/api', (req, res, next) => {
    const host = req.hostname.replace(/^\[|\]$/g, '');
    if (!['localhost', '127.0.0.1', '::1'].includes(host) && !(options.allowLan && isIP(host)))
      return res.status(403).json({ error: '不允许的主机名' });
    const origin = req.headers.origin;
    if (origin && origin !== `${req.protocol}://${req.get('host')}`)
      return res.status(403).json({ error: '请求来源不匹配' });
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (req, res, next) => {
    const now = Date.now();
    for (const [key, s] of sessions) if (now - s.usedAt > 8 * 3600000) sessions.delete(key);
    const sid = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('maiyouji='))
      ?.slice(9);
    let session = sid ? sessions.get(sid) : undefined;
    if (!session) {
      if (sessions.size >= 200) return res.status(429).json({ error: '会话过多，请稍后再试' });
      const id = randomBytes(24).toString('hex');
      session = {
        id,
        csrf: randomBytes(24).toString('hex'),
        unlocked: !options.accessKey,
        usedAt: now,
        window: now,
        calls: 0,
        failures: 0,
      };
      sessions.set(id, session);
      res.cookie('maiyouji', id, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure,
        maxAge: 8 * 3600000,
        path: '/api',
      });
    }
    session.usedAt = now;
    if (now - session.window > 60000) {
      session.window = now;
      session.calls = 0;
      session.failures = 0;
    }
    if (++session.calls > 150) return res.status(429).json({ error: '操作太快了，请稍后再试' });
    res.locals.session = session;
    if (req.method === 'POST' && req.get('x-session-token') !== session.csrf)
      return res.status(403).json({ error: '会话已变化，请刷新页面' });
    if (req.path !== '/session' && req.path !== '/unlock' && !session.unlocked)
      return res.status(401).json({ error: '请先输入应用访问口令' });
    next();
  });
  const wrap =
    (fn: (req: express.Request, res: express.Response) => Promise<void>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      fn(req, res).catch(next);
    };
  const reply = (res: express.Response, result: Bag) =>
    res.json({
      result: result.data,
      meta: {
        mode: getGateway(res.locals.session.id).mode,
        queriedAt: new Date().toISOString(),
        traceId: result.traceId,
        snapshot: getGateway(res.locals.session.id).mode === 'demo' ? publicSnapshot : undefined,
      },
      message: result.message,
    });
  app.get('/api/session', (req, res) =>
    res.json({
      csrf: res.locals.session.csrf,
      locked: !res.locals.session.unlocked,
      mode: getGateway(res.locals.session.id).mode,
      snapshot: publicSnapshot,
      version: '1.0.0',
    }),
  );
  app.post('/api/unlock', (req, res) => {
    const s: Session = res.locals.session;
    if (s.failures >= 5) return res.status(429).json({ error: '口令尝试过多，请一分钟后重试' });
    const given = Buffer.from(String(req.body.key ?? ''));
    const expected = Buffer.from(options.accessKey ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      s.failures++;
      return res.status(401).json({ error: '访问口令不正确' });
    }
    s.unlocked = true;
    res.json({ ok: true });
  });
  app.post(
    '/api/tools/:name',
    wrap(async (req, res) => {
      const name = String(req.params.name);
      if (!TOOL_NAMES.includes(name as any) || WRITE_TOOLS.has(name)) {
        res.status(403).json({ error: '此工具必须通过确认流程执行' });
        return;
      }
      const args = req.body?.args ?? {};
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('参数格式无效');
      if (
        [
          'query-meals',
          'query-meal-detail',
          'query-store-coupons',
          'calculate-price',
          'query-promotions',
          'query-meal-assistance',
        ].includes(name)
      )
        validateContext(args);
      if (name === 'query-survey-coupon' && !/^[A-Za-z0-9_-]{1,64}$/.test(args.orderId ?? ''))
        throw new Error('订单号格式无效');
      reply(res, await getGateway(res.locals.session.id).call(name, args));
    }),
  );
  app.post(
    '/api/actions/prepare',
    wrap(async (req, res) => {
      const s: Session = res.locals.session;
      const { name, args } = req.body ?? {};
      if (typeof name !== 'string' || !args || typeof args !== 'object' || Array.isArray(args))
        throw new Error('操作参数无效');
      res.json(await actions.prepare(s.id, getGateway(s.id), name, args));
    }),
  );
  app.post(
    '/api/actions/commit',
    wrap(async (req, res) => {
      if (req.body?.confirmed !== true) throw new Error('请明确确认此操作');
      const s: Session = res.locals.session;
      reply(res, await actions.commit(s.id, getGateway(s.id), req.body.id));
    }),
  );
  app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith('/api/')) return next(err);
    const text = err.message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 400);
    res.status(400).json({ error: text || '请求失败，请稍后重试' });
  });
  return app;
}
