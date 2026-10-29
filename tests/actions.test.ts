import { describe, it, expect } from 'vitest';
import { ActionService } from '../server/actions';
import { DemoGateway } from '../server/demo';
import type { Gateway } from '../server/mcp';
import type { Bag } from '../shared/domain';
function fake() {
  let quote = 2550;
  let points = '24';
  let mutations = 0;
  let seen: Bag = {};
  const g: Gateway = {
    mode: 'live',
    async call(name, args) {
      seen = args;
      if (name === 'calculate-price') {
        if (args.takeWayCode || args.addressId || args.remark)
          throw new Error('extraneous price arguments');
        return {
          data: {
            price: quote,
            productPrice: quote,
            productList: [{ productName: '巨无霸', quantity: 1, subtotal: quote }],
            takeWayList: [{ code: 'TAKE', title: '打包' }],
          },
        };
      }
      if (name === 'query-meal-detail') return { data: { code: '1100', name: '巨无霸' } };
      if (name === 'query-lottery-info')
        return {
          data: {
            activityCode: 'L',
            drawDecision: {
              resourceEligible: true,
              nextConsumption: { type: 'POINTS', points, text: `消耗${points}积分` },
            },
          },
        };
      mutations++;
      return { data: { orderId: 'O', status: 1 } };
    },
  };
  return {
    g,
    get mutations() {
      return mutations;
    },
    setQuote: (n: number) => (quote = n),
    setPoints: (n: string) => (points = n),
    get seen() {
      return seen;
    },
  };
}
const args = {
  storeCode: '1450713',
  orderType: 1,
  beType: 1,
  items: [{ productCode: '1100', quantity: 1 }],
  takeWayCode: 'TAKE',
};
describe('one-shot confirmations', () => {
  it('never performs a mutation during prepare and binds the ticket to its owner', async () => {
    const f = fake();
    const s = new ActionService();
    const t = await s.prepare('A', f.g, 'create-order', args);
    expect(f.mutations).toBe(0);
    await expect(s.commit('B', f.g, t.id)).rejects.toThrow('过期或已使用');
    expect(f.mutations).toBe(0);
    await s.commit('A', f.g, t.id);
    expect(f.mutations).toBe(1);
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow();
  });
  it('expires previews after 60 seconds', async () => {
    let now = 1000;
    const s = new ActionService(() => now);
    const f = fake();
    const t = await s.prepare('A', f.g, 'create-order', args);
    now += 60001;
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow();
    expect(f.mutations).toBe(0);
  });
  it('requires confirmation again if a price changes', async () => {
    const s = new ActionService();
    const f = fake();
    const t = await s.prepare('A', f.g, 'create-order', args);
    f.setQuote(2600);
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow('价格');
    expect(f.mutations).toBe(0);
  });
  it('requires confirmation again if lottery consumption changes', async () => {
    const s = new ActionService();
    const f = fake();
    const t = await s.prepare('A', f.g, 'draw-lottery', {});
    f.setPoints('48');
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow('消耗发生变化');
    expect(f.mutations).toBe(0);
  });
  it('serializes two confirmations to prevent a double click from spending twice', async () => {
    const s = new ActionService();
    const f = fake();
    const t = await s.prepare('A', f.g, 'draw-lottery', {});
    const results = await Promise.allSettled([s.commit('A', f.g, t.id), s.commit('A', f.g, t.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.mutations).toBe(1);
  });
  it('keeps replayed write failures consumed rather than retrying an uncertain transaction', async () => {
    const f = fake();
    const original = f.g.call;
    f.g.call = async (name, args) => {
      if (name === 'draw-lottery') throw new Error('unknown timeout');
      return original(name, args);
    };
    const s = new ActionService();
    const t = await s.prepare('A', f.g, 'draw-lottery', {});
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow('timeout');
    await expect(s.commit('A', f.g, t.id)).rejects.toThrow('过期或已使用');
  });
  it('invalidates a previous pending ticket when the same user prepares a new action', async () => {
    const f = fake();
    const s = new ActionService();
    const first = await s.prepare('A', f.g, 'draw-lottery', {});
    const second = await s.prepare('A', f.g, 'create-order', args);
    await expect(s.commit('A', f.g, first.id)).rejects.toThrow();
    await s.commit('A', f.g, second.id);
    expect(f.mutations).toBe(1);
  });
  it('blocks unknown actions and invalid pickup choices', async () => {
    const f = fake();
    const s = new ActionService();
    await expect(s.prepare('A', f.g, 'not-real', {})).rejects.toThrow();
    await expect(
      s.prepare('A', f.g, 'create-order', { ...args, takeWayCode: 'FAKE' }),
    ).rejects.toThrow('取餐方式');
  });
  it('does not pass order-only fields to the price tool', async () => {
    const f = fake();
    const s = new ActionService();
    const t = await s.prepare('A', f.g, 'create-order', { ...args, remark: 'Hello' });
    await s.commit('A', f.g, t.id);
    expect(f.mutations).toBe(1);
    expect(f.seen.remark).toBe('Hello');
  });
  it('keeps demo redemptions internally consistent with the demo points balance', async () => {
    const g = new DemoGateway();
    const s = new ActionService();
    const t = await s.prepare('A', g, 'mall-create-order', {
      _spuId: 1,
      skuId: 101,
      spuCategory: '1',
      count: 1,
    });
    expect(t.preview.lines.join(' ')).toContain('200');
    const result = await s.commit('A', g, t.id);
    expect(result.data.status).toBe(1);
    expect((await g.call('query-my-account', {})).data.availablePoint).toBe('824');
  });
});
