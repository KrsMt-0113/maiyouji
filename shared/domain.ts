export type Bag = Record<string, any>;
export type Mode = 'demo' | 'live';
export type Meal = {
  code: string;
  name: string;
  image?: string;
  price: number | null;
  originalPrice: number | null;
  tags: string[];
  categories: string[];
};
export type CartLine = { id: string; meal: Meal; quantity: number; item: Bag; description: string };
export type Context = {
  storeCode: string;
  storeName: string;
  beType: 1 | 2 | 5 | 6;
  orderType: 1 | 2;
  beCode?: string;
  addressId?: string;
  reservationDate?: string;
  gmServiceCode?: string;
};
export const WRITE_TOOLS = new Set([
  'auto-bind-coupons',
  'create-order',
  'cancel-order',
  'delivery-create-address',
  'draw-lottery',
  'mall-create-order',
  'party-order-create',
]);
export const TOOL_NAMES = [
  'auto-bind-coupons',
  'available-coupons',
  'calculate-price',
  'campaign-calendar',
  'cancel-order',
  'create-order',
  'delivery-create-address',
  'delivery-query-addresses',
  'delivery-query-stores',
  'draw-lottery',
  'list-nutrition-foods',
  'mall-create-order',
  'mall-order-detail',
  'mall-order-list',
  'mall-points-products',
  'mall-product-detail',
  'now-time-info',
  'order-list',
  'party-order-create',
  'query-lottery-info',
  'query-meal-assistance',
  'query-meal-detail',
  'query-meals',
  'query-my-account',
  'query-my-coupons',
  'query-my-prizes',
  'query-nearby-stores',
  'query-order',
  'query-party-city',
  'query-party-store',
  'query-party-store-date',
  'query-party-store-session',
  'query-promotions',
  'query-store-coupons',
  'query-survey-coupon',
] as const;
export function yuanToCents(value: unknown): number | null {
  const s = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
  const [whole, decimal = ''] = s.split('.');
  const n = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(n) ? n : null;
}
export const money = (cents: number | null | undefined) =>
  cents == null ? '待核价' : `¥${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
export function normalizeMenu(data: Bag): Meal[] {
  if (!data || typeof data.meals !== 'object') return [];
  const groups: Record<string, { categories: string[]; tags: string[] }> = Object.create(null);
  for (const c of data.categories ?? [])
    for (const m of c.meals ?? []) {
      if (!groups[m.code]) groups[m.code] = { categories: [], tags: [] };
      groups[m.code].categories.push(String(c.name ?? '其他').replace(/\n/g, ''));
      groups[m.code].tags.push(...(m.tags ?? []));
    }
  return Object.entries(data.meals)
    .filter(([, m]) => m && typeof m === 'object')
    .map(([code, m]: [string, any]) => ({
      code,
      name: String(m.name ?? code),
      image: m.image,
      price: yuanToCents(m.currentPrice),
      originalPrice: yuanToCents(m.originalPrice),
      tags: [...new Set(groups[code]?.tags ?? [])],
      categories: groups[code]?.categories ?? ['其他'],
    }));
}
export function normalizeNutrition(raw: unknown): Bag[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* TOON table below */
  }
  const lines = raw.trim().split('\n');
  const header = lines[0]?.match(/\{([^}]+)\}:?$/)?.[1]?.split(',');
  if (!header) return [];
  return lines.slice(1).flatMap((line) => {
    const cells = line.trim().split(',');
    if (cells.length !== header.length) return [];
    return [
      Object.fromEntries(
        header.map((k, i) => [
          k,
          cells[i] === 'null'
            ? null
            : k === 'productName' || k === 'nutritionDescription'
              ? cells[i]
              : Number.isFinite(Number(cells[i]))
                ? Number(cells[i])
                : null,
        ]),
      ),
    ];
  });
}
export const nutritionFor = (name: string, rows: Bag[]) =>
  rows.find((n) => n.productName === name) ?? null;
export function contextArgs(c: Context): Bag {
  return {
    storeCode: c.storeCode,
    beType: c.beType,
    orderType: c.orderType,
    ...(c.beType !== 1 ? { beCode: c.beCode } : {}),
    ...(c.reservationDate ? { reservationDate: c.reservationDate } : {}),
  };
}
export function validateContext(a: Bag) {
  if (![1, 2, 5, 6].includes(a.beType) || a.orderType !== ([1, 5].includes(a.beType) ? 1 : 2))
    throw new Error('取餐方式与订单类型不一致');
  if (typeof a.storeCode !== 'string' || !/^\d+$/.test(a.storeCode))
    throw new Error('请先选择有效门店');
  if (a.beType === 1 && a.beCode) throw new Error('到店自取不应传业务编码');
  if (a.beType !== 1 && !a.beCode) throw new Error('门店缺少业务编码，请重新选择门店');
}
export function buildModification(
  items: Bag[],
  quantities: Record<string, number>,
): Bag | undefined {
  const values: Bag[] = [];
  for (const [gi, group] of items.entries()) {
    let total = 0;
    for (const [vi, v] of (group.values ?? []).entries()) {
      const q = quantities[`${gi}:${vi}`] ?? v.selectedQuantity ?? 0;
      if (
        !Number.isInteger(q) ||
        q < 0 ||
        q > ((v.maxQuantity ?? 1) < 0 ? Infinity : (v.maxQuantity ?? 1)) ||
        (q > 0 && q < (v.minQuantity ?? 0))
      )
        throw new Error(`请检查「${v.name}」数量`);
      total += q;
      if (q > 0) {
        if (!v.selectedKey) throw new Error('该特调项缺少选中编码');
        values.push({ code: v.code, key: v.selectedKey, quantity: q });
      } else if (v.unselectedKey) {
        values.push({ code: v.code, key: v.unselectedKey, quantity: 0 });
      }
    }
    if (total < (group.minValues ?? 0) || total > (group.maxValues ?? Infinity))
      throw new Error('特调选项数量不符合要求');
  }
  return values.length ? { values } : undefined;
}
export function buildMealItem(
  detail: Bag,
  selections: Record<string, Record<string, number>>,
  mods: Record<string, Record<string, number>>,
): Bag {
  const item: Bag = { productCode: detail.code, quantity: 1 };
  const mod = buildModification(detail.modification?.items ?? [], mods.main ?? {});
  if (mod) item.modification = mod;
  if (detail.rounds?.length)
    item.roundList = detail.rounds.map((round: Bag) => {
      const selected =
        selections[String(round.id)] ??
        Object.fromEntries(
          (round.choices ?? []).map((c: Bag) => [
            c.code,
            c.isDefault === 1 ? (c.quantity ?? 1) : 0,
          ]),
        );
      const combos = (round.choices ?? []).flatMap((choice: Bag) => {
        const q = selected[choice.code] ?? 0;
        if (
          !Number.isInteger(q) ||
          q < 0 ||
          q >
            ((choice.maxQuantity ?? 1) < 0
              ? Infinity
              : (choice.maxQuantity ?? round.maxQuantity ?? 1))
        )
          throw new Error(`请检查「${round.name}」的数量`);
        if (!q) return [];
        const modification = buildModification(
          choice.modification?.items ?? [],
          mods[`${round.id}:${choice.code}`] ?? {},
        );
        return [{ code: choice.code, quantity: q, ...(modification ? { modification } : {}) }];
      });
      const total = combos.reduce((n: number, c: Bag) => n + c.quantity, 0);
      if (
        total < (round.minQuantity ?? round.quantity ?? 1) ||
        total > (round.maxQuantity ?? round.quantity ?? 1)
      )
        throw new Error(
          `「${round.name}」需要选择 ${round.minQuantity ?? round.quantity ?? 1} 至 ${round.maxQuantity ?? round.quantity ?? 1} 份`,
        );
      return { round: String(round.id), comboItemList: combos };
    });
  return item;
}
export function makeInspiration(
  meals: Meal[],
  budget: number,
  exclude: string[],
  count: number,
  random = Math.random,
): Meal[] {
  const pool = meals.filter(
    (m) =>
      m.price !== null &&
      m.price <= budget &&
      !exclude.some((w) => w && m.name.includes(w)) &&
      !/卡$|玩具|徽章|券|挠痒|捶背|丝巾|棒球帽/.test(m.name),
  );
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const result: Meal[] = [];
  let spent = 0;
  for (const m of shuffled) {
    if (result.length >= count) break;
    if (spent + (m.price ?? 0) <= budget) {
      result.push(m);
      spent += m.price ?? 0;
    }
  }
  return result;
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function nextConsumption(data: Bag) {
  const d = data.drawDecision;
  if (!d?.resourceEligible || !d.nextConsumption) throw new Error(d?.reason || '当前无法参与抽奖');
  return {
    activityCode: data.activityCode,
    nextConsumption: d.nextConsumption,
    fallbackConsumption: d.fallbackConsumption ?? null,
  };
}
export const statusName = (s: unknown) =>
  ({
    '1': '待支付',
    '2': '配餐中',
    '4': '配送中',
    '6': '已完成',
    '7': '已取消',
    '8': '已评价',
    '10': '餐厅配餐中',
  })[String(s)] ?? '状态以订单详情为准';
export function safeUrl(value: unknown): string | undefined {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
}
