import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { DemoGateway } from '../server/demo';
import { unpack } from '../server/mcp';
async function setup(accessKey?: string) {
  const g = new DemoGateway();
  const app = createApp(() => g, { accessKey });
  const agent = request.agent(app);
  const r = await agent.get('/api/session');
  return { agent, app, csrf: r.body.csrf };
}
describe('HTTP boundary and API integration', () => {
  it('never exposes a token and marks every tool result as demo', async () => {
    const { agent, csrf } = await setup();
    const r = await agent
      .post('/api/tools/query-my-account')
      .set('x-session-token', csrf)
      .send({ args: {} });
    expect(r.status).toBe(200);
    expect(r.body.meta.mode).toBe('demo');
    expect(r.body.result.availablePoint).toBe('1024');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(r.body)).not.toContain('Bearer');
  });
  it('rejects cross-origin calls, DNS rebinding hosts, missing CSRF and direct writes', async () => {
    const { agent, csrf } = await setup();
    expect((await agent.get('/api/session').set('Host', 'attacker.example')).status).toBe(403);
    expect(
      (
        await agent
          .post('/api/tools/query-my-account')
          .set('Origin', 'https://evil.example')
          .send({ args: {} })
      ).status,
    ).toBe(403);
    expect((await agent.post('/api/tools/query-my-account').send({ args: {} })).status).toBe(403);
    expect(
      (await agent.post('/api/tools/draw-lottery').set('x-session-token', csrf).send({ args: {} }))
        .status,
    ).toBe(403);
  });
  it('requires the explicit confirmed field and does not allow a second session to commit a ticket', async () => {
    const { agent, app, csrf } = await setup();
    const prep = await agent
      .post('/api/actions/prepare')
      .set('x-session-token', csrf)
      .send({ name: 'draw-lottery', args: {} });
    expect(prep.status).toBe(200);
    const no = await agent
      .post('/api/actions/commit')
      .set('x-session-token', csrf)
      .send({ id: prep.body.id });
    expect(no.status).toBe(400);
    const second = request.agent(app);
    const sess = await second.get('/api/session');
    expect(
      (
        await second
          .post('/api/actions/commit')
          .set('x-session-token', sess.body.csrf)
          .send({ id: prep.body.id, confirmed: true })
      ).status,
    ).toBe(400);
    const yes = await agent
      .post('/api/actions/commit')
      .set('x-session-token', csrf)
      .send({ id: prep.body.id, confirmed: true });
    expect(yes.status).toBe(200);
    expect(yes.body.result.remainPoint).toBe('1000');
  });
  it('enforces application access keys before personal data access', async () => {
    const { agent, csrf } = await setup('long-private-key-123');
    expect(
      (
        await agent
          .post('/api/tools/query-my-account')
          .set('x-session-token', csrf)
          .send({ args: {} })
      ).status,
    ).toBe(401);
    expect(
      (await agent.post('/api/unlock').set('x-session-token', csrf).send({ key: 'wrong' })).status,
    ).toBe(401);
    expect(
      (
        await agent
          .post('/api/unlock')
          .set('x-session-token', csrf)
          .send({ key: 'long-private-key-123' })
      ).status,
    ).toBe(200);
    expect(
      (
        await agent
          .post('/api/tools/query-my-account')
          .set('x-session-token', csrf)
          .send({ args: {} })
      ).status,
    ).toBe(200);
  });
  it('validates fulfilment context and user-supplied order ids', async () => {
    const { agent, csrf } = await setup();
    expect(
      (
        await agent
          .post('/api/tools/query-meals')
          .set('x-session-token', csrf)
          .send({ args: { beType: 2, orderType: 1, storeCode: '123' } })
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .post('/api/tools/query-survey-coupon')
          .set('x-session-token', csrf)
          .send({ args: { orderId: '<script>' } })
      ).status,
    ).toBe(400);
  });
  it('returns official business failures instead of silently using demo data', () => {
    expect(() => unpack({ structuredContent: { code: 401, message: '登录已过期' } })).toThrow(
      '登录已过期',
    );
    expect(() => unpack({ isError: true, content: [] })).toThrow();
    expect(
      unpack({
        content: [{ type: 'text', text: 'result\n```json\n{"code":200,"data":{"ok":true}}\n```' }],
      }).data.ok,
    ).toBe(true);
  });
  it('runs a full demo menu → details → quote → preview → confirmed order → cancel flow', async () => {
    const { agent, csrf } = await setup();
    const post = (path: string, body: any) =>
      agent.post(path).set('x-session-token', csrf).send(body);
    const ctx = { storeCode: '1450713', beType: 1, orderType: 1 };
    const m = await post('/api/tools/query-meals', { args: ctx });
    expect(Object.keys(m.body.result.meals).length).toBe(112);
    const d = await post('/api/tools/query-meal-detail', { args: { ...ctx, code: '1100' } });
    expect(d.body.result.supportModify).toBe(true);
    const items = [{ productCode: '1100', quantity: 1 }];
    const q = await post('/api/tools/calculate-price', { args: { ...ctx, items } });
    expect(q.body.result.price).toBe(2550);
    const p = await post('/api/actions/prepare', {
      name: 'create-order',
      args: { ...ctx, items, takeWayCode: q.body.result.takeWayList[0].code },
    });
    expect(p.status).toBe(200);
    const c = await post('/api/actions/commit', { id: p.body.id, confirmed: true });
    const id = c.body.result.orderId;
    expect(id).toMatch(/^DEMO-/);
    const cancel = await post('/api/actions/prepare', {
      name: 'cancel-order',
      args: { orderId: id, cancelReasonCode: '1' },
    });
    await post('/api/actions/commit', { id: cancel.body.id, confirmed: true });
    const order = await post('/api/tools/query-order', { args: { orderId: id } });
    expect(order.body.result.orderStatus).toBe('7');
  });
});
