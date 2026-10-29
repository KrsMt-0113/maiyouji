import { describe, it, expect } from 'vitest';
import snapshot from '../data/public-snapshot.json';
import details from '../data/meal-details.json';
import {
  yuanToCents,
  normalizeMenu,
  normalizeNutrition,
  nutritionFor,
  buildMealItem,
  buildModification,
  validateContext,
  contextArgs,
  makeInspiration,
  nextConsumption,
  safeUrl,
  stable,
  type Bag,
} from '../shared/domain';
describe('money and public snapshot contracts', () => {
  it.each([
    ['0', 0],
    ['26.9', 2690],
    ['0.01', 1],
    ['13.50', 1350],
    [' 25.5 ', 2550],
    ['-1', null],
    ['abc', null],
    ['', null],
    ['1.001', null],
    ['1e3', null],
    [undefined, null],
  ])('converts %s to exact integer cents', (s, n) => expect(yuanToCents(s)).toBe(n));
  it('normalizes all 112 unique public menu items and merges category tags', () => {
    const meals = normalizeMenu(snapshot.menu);
    expect(meals).toHaveLength(112);
    expect(new Set(meals.map((m) => m.code)).size).toBe(112);
    expect(meals.find((m) => m.code === '1100')).toMatchObject({ name: '巨无霸', price: 2550 });
    expect(meals.find((m) => m.code === '9900016073')!.categories.length).toBeGreaterThan(1);
  });
  it('decodes the actual TOON nutrition table without replacing missing values by zero', () => {
    const rows = normalizeNutrition(snapshot.nutrition);
    expect(rows).toHaveLength(160);
    expect(nutritionFor('巨无霸', rows)).toMatchObject({ energyKcal: 513, protein: 27 });
    expect(nutritionFor('巨无霸三件套', rows)).toBeNull();
    expect(normalizeNutrition('[1]{productName,energyKcal}:\n  X,null')).toEqual([
      { productName: 'X', energyKcal: null },
    ]);
  });
  it('keeps missing menu prices unknown', () =>
    expect(normalizeMenu({ meals: { x: { name: 'X' } } })[0].price).toBeNull());
});
describe('MCP customization semantics from real captured details', () => {
  it('sends all unselectedKey entries when removing an ingredient', () => {
    const item = buildMealItem(details['1100'], {}, { main: { '0:0': 0 } });
    expect(item.modification.values).toHaveLength(5);
    expect(item.modification.values[0]).toEqual({ code: '100116', key: '0-0', quantity: 0 });
    expect(item.modification.values[1].key).toBe('0-1');
  });
  it('accepts upstream -1 as an unlimited choice quantity instead of rejecting all combos', () => {
    const item = buildMealItem(details['9900016073'], {}, {});
    expect(item.roundList).toHaveLength(3);
    expect(item.roundList[2].comboItemList[0]).toMatchObject({ code: '3050', quantity: 1 });
  });
  it('distinguishes ice choices that share the SAME code using their option index', () => {
    const drink: Bag = details['9900016073'].rounds[2].choices[0];
    const modification = buildModification(drink.modification.items, {
      '0:0': 0,
      '0:1': 1,
      '0:2': 0,
      '0:3': 0,
    });
    expect(modification!.values).toEqual([{ code: '200002', key: '0-0', quantity: 1 }]);
  });
  it('rejects mutually exclusive duplicate ice choices', () => {
    const drink: Bag = details['9900016073'].rounds[2].choices[0];
    expect(() => buildModification(drink.modification.items, { '0:0': 1, '0:1': 1 })).toThrow();
  });
  it('rejects a missing mandatory combo round', () =>
    expect(() => buildMealItem(details['9900016073'], { '2': {} }, {})).toThrow('需要选择'));
  it('rejects negative and noninteger modifier quantities', () => {
    const items = (details['1100'] as Bag).modification.items;
    expect(() => buildModification(items, { '0:0': -1 })).toThrow();
    expect(() => buildModification(items, { '0:0': 0.5 })).toThrow();
  });
});
describe('fulfilment context', () => {
  it.each([
    [1, 1],
    [5, 1],
    [2, 2],
    [6, 2],
  ])('validates channel %s with order type %s', (beType, orderType) => {
    expect(() =>
      validateContext({
        beType,
        orderType,
        storeCode: '123',
        ...(beType !== 1 ? { beCode: 'B' } : {}),
      }),
    ).not.toThrow();
  });
  it('rejects a cross-channel context and missing business code', () => {
    expect(() =>
      validateContext({ storeCode: '123', beType: 2, orderType: 1, beCode: 'B' }),
    ).toThrow();
    expect(() => validateContext({ storeCode: '123', beType: 5, orderType: 1 })).toThrow();
    expect(() =>
      validateContext({ storeCode: '123', beType: 1, orderType: 1, beCode: 'B' }),
    ).toThrow();
  });
  it('does not send a delivery address, storeName or business code to pickup menu calls', () =>
    expect(
      contextArgs({ storeCode: '123', storeName: 'Name', beType: 1, orderType: 1, addressId: 'A' }),
    ).toEqual({ storeCode: '123', beType: 1, orderType: 1 }));
});
describe('playful tools preserve the users constraints', () => {
  it('never exceeds the reference budget and never duplicates items', () => {
    const meals = normalizeMenu(snapshot.menu);
    for (let i = 10; i <= 100; i++) {
      const picks = makeInspiration(meals, i * 100, ['辣'], 3);
      expect(picks.reduce((n, m) => n + m.price!, 0)).toBeLessThanOrEqual(i * 100);
      expect(picks.every((m) => !m.name.includes('辣'))).toBe(true);
      expect(new Set(picks.map((m) => m.code)).size).toBe(picks.length);
    }
  });
  it('returns an empty set instead of inventing a meal under impossible constraints', () =>
    expect(makeInspiration(normalizeMenu(snapshot.menu), 0, [], 3)).toEqual([]));
  it('uses server resource eligibility even if remaining chances are zero', () => {
    const data = {
      availableTimes: 0,
      drawDecision: { resourceEligible: true, nextConsumption: { type: 'POINTS', points: '24' } },
    };
    expect(nextConsumption(data).nextConsumption.type).toBe('POINTS');
    expect(() =>
      nextConsumption({ availableTimes: 5, drawDecision: { resourceEligible: false } }),
    ).toThrow();
  });
  it('rejects executable and non-HTTPS output links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeUrl('http://example.com')).toBeUndefined();
    expect(safeUrl('https://example.com/pay')).toBe('https://example.com/pay');
  });
  it('compares nested confirmation payloads independently of object property order', () =>
    expect(stable({ x: 1, y: { a: 2, b: 3 } })).toBe(stable({ y: { b: 3, a: 2 }, x: 1 })));
});
