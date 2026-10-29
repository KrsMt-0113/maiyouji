import { randomUUID } from 'node:crypto';
import {
  WRITE_TOOLS,
  validateContext,
  contextArgs,
  nextConsumption,
  stable,
  money,
  type Bag,
} from '../shared/domain.ts';
import type { Gateway } from './mcp.ts';
export type Preview = { title: string; lines: string[]; details?: Bag; note: string };
type Ticket = {
  owner: string;
  name: string;
  args: Bag;
  guard: string;
  expires: number;
  preview: Preview;
};
const quoteGuard = (q: Bag) =>
  stable({
    price: q.price,
    productPrice: q.productPrice,
    deliveryPrice: q.deliveryPrice,
    packingPrice: q.packingPrice,
    tablewarePrice: q.tablewarePrice,
    discount: q.discount,
    products: q.productList,
    takeWayList: q.takeWayList,
  });
function priceArgs(a: Bag): Bag {
  return Object.fromEntries(
    [
      'storeCode',
      'beType',
      'beCode',
      'orderType',
      'reservationDate',
      'items',
      'needTableware',
      'gmServiceCode',
      'withOrder',
    ]
      .filter((k) => a[k] !== undefined)
      .map((k) => [k, a[k]]),
  );
}
function checkItems(a: Bag) {
  validateContext(a);
  if (!Array.isArray(a.items) || !a.items.length || a.items.length > 50)
    throw new Error('请添加 1 至 50 种餐品');
  for (const i of a.items)
    if (
      typeof i.productCode !== 'string' ||
      !Number.isInteger(i.quantity) ||
      i.quantity < 1 ||
      i.quantity > 99
    )
      throw new Error('餐品编码或数量无效');
}
export class ActionService {
  private tickets = new Map<string, Ticket>();
  private busy = false;
  constructor(private now = () => Date.now()) {}
  async prepare(owner: string, g: Gateway, name: string, args: Bag) {
    if (!WRITE_TOOLS.has(name)) throw new Error('不支持此操作');
    for (const [id, t] of this.tickets)
      if (t.expires < this.now() || t.owner === owner) this.tickets.delete(id);
    if (this.tickets.size >= 500) throw new Error('操作队列繁忙，请稍后重试');
    let preview: Preview = {
      title: '确认操作',
      lines: [],
      note:
        g.mode === 'demo'
          ? '这是演示操作，不会修改真实账户。'
          : '确认后将通过麦当劳 MCP 修改你的账户。',
    };
    let guard = '';
    switch (name) {
      case 'create-order': {
        checkItems(args);
        if (args.orderType === 2 && !args.addressId) throw new Error('请选择配送地址');
        if (args.beType === 6 && !args.gmServiceCode) throw new Error('请选择助餐服务');
        if (String(args.remark ?? '').length > 50) throw new Error('备注最多 50 字');
        const q = (await g.call('calculate-price', priceArgs(args))).data;
        if (!q || !Number.isSafeInteger(q.price) || q.price < 0)
          throw new Error('没有获得有效核价，无法下单');
        if (args.orderType === 1 && !q.takeWayList?.some((t: Bag) => t.code === args.takeWayCode))
          throw new Error('请选择官方返回的取餐方式');
        const deliveryLines: string[] = [];
        if (args.orderType === 2) {
          const addresses = (await g.call('delivery-query-addresses', {})).data?.addresses ?? [];
          const address = addresses.find((a: Bag) => a.addressId === args.addressId);
          if (!address) throw new Error('配送地址已变化，请重新选择');
          deliveryLines.push(
            `送至 ${address.fullAddress} · ${address.contactName} · ${address.phone}`,
          );
        }
        const customizationLines: string[] = [];
        for (const item of args.items) {
          const d = (
            await g.call('query-meal-detail', {
              ...contextArgs(args as any),
              code: item.productCode,
            })
          ).data;
          const describe = (groups: Bag[], values: Bag[], prefix: string) => {
            for (const group of groups ?? []) {
              for (const v of group.values ?? []) {
                const selected = (values ?? []).find(
                  (x: Bag) => x.code === v.code && x.key === v.selectedKey && x.quantity > 0,
                );
                const removed =
                  v.unselectedKey &&
                  (values ?? []).some(
                    (x: Bag) => x.code === v.code && x.key === v.unselectedKey && x.quantity === 0,
                  );
                if (selected && ((v.selectedQuantity ?? 0) === 0 || group.maxValues === 1))
                  customizationLines.push(`${prefix}${v.name}`);
                else if (removed && (v.selectedQuantity ?? 0) > 0)
                  customizationLines.push(`${prefix}去掉${v.name}`);
              }
            }
          };
          describe(
            d?.modification?.items,
            item.modification?.values ?? [],
            `${d?.name ?? item.productCode}：`,
          );
          for (const round of item.roundList ?? []) {
            const source = d?.rounds?.find((r: Bag) => String(r.id) === round.round);
            for (const c of round.comboItemList ?? []) {
              const choice = source?.choices?.find((x: Bag) => x.code === c.code);
              if (choice) {
                customizationLines.push(`${source.name}：${choice.name} × ${c.quantity}`);
                describe(
                  choice.modification?.items,
                  c.modification?.values ?? [],
                  `${choice.name}：`,
                );
              }
            }
          }
        }
        guard = quoteGuard(q);
        preview = {
          ...preview,
          title: '确认创建订单',
          lines: [
            `应付 ${money(q.price)}`,
            `门店编号 ${args.storeCode}`,
            ...deliveryLines,
            `方式 ${args.orderType === 1 ? (q.takeWayList?.find((t: Bag) => t.code === args.takeWayCode)?.title ?? '到店取餐') : '配送到家'}${args.reservationDate ? ' · ' + args.reservationDate : ' · 立即'}`,
            ...(q.productList?.map(
              (p: Bag) => `${p.productName} × ${p.quantity}  ${money(p.subtotal)}`,
            ) ?? []),
            ...customizationLines,
          ],
          details: q,
          note: preview.note + ' 创建订单后需自行打开支付链接完成支付。',
        };
        break;
      }
      case 'draw-lottery': {
        const data = (await g.call('query-lottery-info', {})).data;
        const decision = nextConsumption(data);
        guard = stable(decision);
        preview = {
          ...preview,
          title: '确认抽奖一次',
          lines: [
            data.activityName ?? '积分抽奖',
            decision.nextConsumption.text ??
              `本次消耗 ${decision.nextConsumption.points ?? 0} 积分 / ${decision.nextConsumption.chances ?? 0} 次`,
            ...(decision.fallbackConsumption
              ? [
                  '本次优先消耗次数；次数用完后将改为消耗积分',
                  decision.fallbackConsumption.text ?? '',
                ]
              : []),
          ],
          details: decision,
          note: preview.note + ' 仅执行一次，不保证中奖。',
        };
        break;
      }
      case 'auto-bind-coupons': {
        const coupons = (await g.call('available-coupons', {})).data ?? [];
        preview = {
          ...preview,
          title: '确认领取当前可领的全部券',
          lines: coupons
            .filter((c: Bag) => c.couponStatus === 'CAN_GET')
            .map((c: Bag) => c.couponName),
          note: preview.note + ' 实际领取结果由服务端返回。',
        };
        break;
      }
      case 'cancel-order': {
        if (!['1', '2', '3', '4', '5', '-1'].includes(args.cancelReasonCode))
          throw new Error('请选择取消原因');
        const order = (await g.call('query-order', { orderId: args.orderId })).data;
        preview = {
          ...preview,
          title: '确认取消订单',
          lines: [
            `订单 ${args.orderId}`,
            order?.storeName ?? '',
            `当前状态 ${order?.status ?? order?.orderStatus ?? '未知'}`,
          ],
        };
        break;
      }
      case 'delivery-create-address': {
        for (const k of ['city', 'contactName', 'address', 'addressDetail', 'gender'])
          if (!String(args[k] ?? '').trim()) throw new Error('请完整填写地址和联系人信息');
        if (!/^1\d{10}$/.test(args.phone)) throw new Error('请填写 11 位手机号码');
        preview = {
          ...preview,
          title: '确认新增配送地址',
          lines: [
            `${args.contactName} ${args.gender} · ${args.phone}`,
            `${args.city}${args.address}${args.addressDetail}`,
          ],
        };
        break;
      }
      case 'mall-create-order': {
        if (!Number.isInteger(args.count) || args.count < 1 || args.count > 99)
          throw new Error('请选择兑换数量');
        const products = (await g.call('mall-points-products', {})).data ?? [];
        let d: Bag | undefined; // The selected SPU is supplied for verification only; it is not sent as an unsupported tool parameter.
        const spuId = args._spuId;
        if (!products.some((p: Bag) => p.spuId === spuId)) throw new Error('请重新选择兑换商品');
        d = (await g.call('mall-product-detail', { spuId })).data;
        const sku = d?.skuList?.find((s: Bag) => s.skuId === args.skuId);
        if (d?.shopId !== 2 || !sku || String(d.spuCategory) !== String(args.spuCategory))
          throw new Error('商品不支持此兑换流程');
        if (String(args.spuCategory) === '2' && !args.addressId)
          throw new Error('实物商品需要配送地址');
        const points = Number(sku.points);
        const available = Number((await g.call('query-my-account', {})).data?.availablePoint);
        if (
          !Number.isFinite(points) ||
          !Number.isFinite(available) ||
          available < points * args.count
        )
          throw new Error('积分不足或无法确认积分余额');
        guard = stable({ sku, shopId: d.shopId });
        preview = {
          ...preview,
          title: '确认积分兑换',
          lines: [
            d.spuName,
            `数量 ${args.count}`,
            `扣减 ${points * args.count} 积分`,
            ...(sku.price != null ? [`商品金额 ¥${sku.price} / 份`] : []),
            ...(sku.extTradePrice != null
              ? [`使用兑换券时另需支付 ¥${sku.extTradePrice} / 份`]
              : []),
          ],
          details: { note: d.note },
          note: preview.note + ' 商品库存和限购以下单接口结果为准。',
        };
        break;
      }
      case 'party-order-create': {
        if (
          !Number.isInteger(args.count) ||
          args.count < 1 ||
          !args.spuId ||
          !args.skuId ||
          !args.storeCode ||
          !args.code ||
          !args.dateStr ||
          !args.id ||
          ![1, 2].includes(args.partyType)
        )
          throw new Error('请完整选择活动、城市、门店、日期、场次和人数');
        const d = (await g.call('mall-product-detail', { spuId: args.spuId })).data;
        if (d?.shopId !== 5 || !d.skuList?.some((s: Bag) => s.skuId === args.skuId))
          throw new Error('该商品不支持活动预约');
        if (d.partyType !== -1 && d.partyType !== args.partyType)
          throw new Error('请选择活动支持的场次类型');
        const sessions =
          (
            await g.call('query-party-store-session', {
              spuId: args.spuId,
              storeCode: args.storeCode,
              dateStr: args.dateStr,
            })
          ).data ?? [];
        const s = sessions.find((s: Bag) => s.id === args.id);
        if (!s) throw new Error('场次已变化，请重新选择');
        guard = stable(s);
        args = {
          ...args,
          leftNum: s.leftNum,
          timeStart: s.timeStart,
          timeEnd: s.timeEnd,
          partyTimeInfo: s,
        };
        preview = {
          ...preview,
          title: '确认活动预约',
          lines: [
            d.spuName,
            `${args.dateStr} ${s.timeStart}–${s.timeEnd}`,
            `门店编号 ${args.storeCode}`,
            `${args.partyType === 1 ? '包场' : '拼团'} · ${args.count} 人`,
            `场次展示价格 ${s.price ?? '未知'}（最终以订单为准）`,
          ],
          details: { note: d.note, partyPeople: d.partyPeople },
        };
        break;
      }
    }
    const id = randomUUID();
    const expires = this.now() + 60000;
    this.tickets.set(id, { owner, name, args: structuredClone(args), guard, preview, expires });
    return { id, expires, preview };
  }
  async commit(owner: string, g: Gateway, id: string) {
    const t = this.tickets.get(id);
    if (!t || t.owner !== owner || t.expires < this.now())
      throw new Error('确认已过期或已使用，请重新预览');
    if (this.busy) throw new Error('上一项操作尚未完成，请稍后再试');
    this.tickets.delete(id);
    this.busy = true;
    try {
      if (t.name === 'create-order') {
        const q = (await g.call('calculate-price', priceArgs(t.args))).data;
        if (quoteGuard(q) !== t.guard) throw new Error('价格或取餐方式发生变化，请重新核价并确认');
      }
      if (t.name === 'draw-lottery') {
        const d = nextConsumption((await g.call('query-lottery-info', {})).data);
        if (stable(d) !== t.guard) throw new Error('抽奖消耗发生变化，请重新查看并确认');
      }
      if (t.name === 'mall-create-order') {
        const d = (await g.call('mall-product-detail', { spuId: t.args._spuId })).data;
        const sku = d?.skuList?.find((s: Bag) => s.skuId === t.args.skuId);
        if (stable({ sku, shopId: d?.shopId }) !== t.guard)
          throw new Error('商品规格或兑换消耗已变化，请重新确认');
      }
      if (t.name === 'party-order-create') {
        const sessions =
          (
            await g.call('query-party-store-session', {
              spuId: t.args.spuId,
              storeCode: t.args.storeCode,
              dateStr: t.args.dateStr,
            })
          ).data ?? [];
        if (stable(sessions.find((s: Bag) => s.id === t.args.id)) !== t.guard)
          throw new Error('场次信息已变化，请重新选择并确认');
      }
      const { _spuId, ...args } = t.args;
      return await g.call(t.name, args);
    } finally {
      this.busy = false;
    }
  }
}
