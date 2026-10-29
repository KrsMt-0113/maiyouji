import snapshot from '../data/public-snapshot.json' with { type: 'json' };
import detailSnapshot from '../data/meal-details.json' with { type: 'json' };
import { normalizeMenu, yuanToCents, type Bag } from '../shared/domain.ts';
import type { Gateway } from './mcp.ts';
const meals = normalizeMenu(snapshot.menu);
const details: Bag = detailSnapshot;
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export class DemoGateway implements Gateway {
  mode = 'demo' as const;
  private points = 1024;
  private claimed = false;
  private orders: Bag[] = [];
  private mallOrders: Bag[] = [];
  private address: Bag[] = [];
  async call(name: string, a: Bag): Promise<Bag> {
    let data: any;
    switch (name) {
      case 'now-time-info':
        data = { datetime: new Date().toISOString(), timezone: 'Asia/Shanghai' };
        break;
      case 'query-nearby-stores':
      case 'delivery-query-stores':
        data = snapshot.stores.map((s) => ({
          ...s,
          storeName: `${s.storeName} · 示例`,
          ...(name === 'delivery-query-stores' || a.beType === 5 ? { beCode: 'DEMO-BE' } : {}),
          reservationTimeOptions: [
            {
              date: today(),
              today: true,
              reservationOptionText: '演示：请自选有效日期与时间，非实时门店时段',
            },
          ],
        }));
        break;
      case 'query-meals':
        data = snapshot.menu;
        break;
      case 'list-nutrition-foods':
        data = snapshot.nutrition;
        break;
      case 'query-meal-detail': {
        const m = meals.find((m) => m.code === a.code);
        if (!m) throw new Error('演示菜单中没有该商品');
        data = details[a.code] ?? {
          code: m.code,
          name: m.name,
          image: m.image,
          rounds: [],
          supportModify: false,
          demoDetail: true,
        };
        break;
      }
      case 'calculate-price': {
        const products = (a.items ?? []).map((i: Bag) => {
          const m = meals.find((m) => m.code === i.productCode);
          if (!m || m.price === null) throw new Error('餐品不可核价');
          let extra = 0;
          const d = details[i.productCode];
          for (const r of i.roundList ?? [])
            for (const choice of r.comboItemList ?? []) {
              const found = d?.rounds
                ?.find((x: Bag) => String(x.id) === String(r.round))
                ?.choices?.find((x: Bag) => x.code === choice.code);
              if (found) {
                const text = String(found.diffPrice ?? '');
                const match = text.match(/([+-])\s*¥?\s*(\d+(?:\.\d+)?)/);
                if (match)
                  extra +=
                    (match[1] === '-' ? -1 : 1) * (yuanToCents(match[2]) ?? 0) * choice.quantity;
              }
              for (const v of choice.modification?.values ?? []) {
                if (v.quantity > 0) {
                  const o = found?.modification?.items
                    ?.flatMap((g: Bag) => g.values ?? [])
                    .find((x: Bag) => x.code === v.code && x.selectedKey === v.key);
                  extra += (o?.price ?? 0) * v.quantity;
                }
              }
            }
          for (const v of i.modification?.values ?? []) {
            if (v.quantity > 0) {
              const o = d?.modification?.items
                ?.flatMap((g: Bag) => g.values ?? [])
                .find((x: Bag) => x.code === v.code && x.selectedKey === v.key);
              extra += (o?.price ?? 0) * v.quantity;
            }
          }
          const unit = m.price + extra;
          return {
            productCode: m.code,
            productName: m.name,
            quantity: i.quantity,
            originalSubtotal: unit * i.quantity,
            subtotal: unit * i.quantity,
          };
        });
        const productPrice = products.reduce((n: number, p: Bag) => n + p.subtotal, 0);
        const deliveryPrice = a.orderType === 2 ? 600 : 0;
        const tablewarePrice = a.needTableware ? 50 : 0;
        data = {
          price: productPrice + deliveryPrice + tablewarePrice,
          originalPrice: productPrice + deliveryPrice + tablewarePrice,
          discount: 0,
          productPrice,
          productOriginalPrice: productPrice,
          deliveryPrice,
          packingPrice: 0,
          tablewarePrice,
          productList: products,
          takeWayList:
            a.orderType === 1
              ? [
                  { code: 'DEMO-TAKE', title: '打包带走' },
                  { code: 'DEMO-DINE', title: '店内用餐' },
                ]
              : [],
        };
        break;
      }
      case 'create-order': {
        const quote = (await this.call('calculate-price', a)).data;
        data = {
          orderId: `DEMO-${Date.now()}`,
          orderDetail: {
            orderStatus: '1',
            status: '演示订单 · 不可支付',
            realTotalAmount: (quote.price / 100).toFixed(2),
            storeName: '示例餐厅',
            orderProductList: quote.productList.map((p: Bag) => ({
              productName: p.productName,
              quantity: p.quantity,
              price: (p.subtotal / p.quantity / 100).toFixed(2),
            })),
          },
        };
        this.orders.unshift({
          ...data.orderDetail,
          orderId: data.orderId,
          storeCode: a.storeCode,
          orderType: String(a.orderType),
          createTime: new Date().toLocaleString('zh-CN'),
          orderProductList: data.orderDetail.orderProductList,
        });
        break;
      }
      case 'order-list':
        data = { list: this.orders };
        break;
      case 'query-order':
        data = this.orders.find((o) => o.orderId === a.orderId);
        if (!data) throw new Error('未找到演示订单');
        break;
      case 'cancel-order': {
        const o = this.orders.find((o) => o.orderId === a.orderId);
        if (!o) throw new Error('未找到演示订单');
        o.orderStatus = '7';
        data = { cancelResult: true, orderId: o.orderId };
        break;
      }
      case 'query-my-account':
        data = {
          availablePoint: String(this.points),
          currentMouthExpirePoint: '120',
          nextMouthExpirePoint: '80',
          accumulativePoint: '2048',
          usedPoint: String(1024 - this.points),
        };
        break;
      case 'available-coupons':
        data = [
          { couponName: '11.9元麦辣鸡腿堡', label: '已领取', couponStatus: 'HAVING_RECEIVE' },
          {
            couponName: '免费脆薯饼',
            label: this.claimed ? '已领取' : '可领取',
            couponStatus: this.claimed ? 'HAVING_RECEIVE' : 'CAN_GET',
          },
        ];
        break;
      case 'auto-bind-coupons':
        data = {
          successCount: this.claimed ? 0 : 1,
          totalCount: this.claimed ? 0 : 1,
          failedCount: 0,
          successCoupons: this.claimed ? [] : [{ couponName: '免费脆薯饼（演示券）' }],
        };
        this.claimed = true;
        break;
      case 'query-my-coupons':
        data = {
          coupons: [
            {
              id: 'DEMO-C1',
              title: '11.9元麦辣鸡腿堡 · 演示',
              subtitle: '卡包展示不保证当前门店可用',
              datetimeText: '演示有效期，不可核销',
              enable: 1,
            },
            ...(this.claimed
              ? [
                  {
                    id: 'DEMO-C2',
                    title: '免费脆薯饼 · 演示',
                    datetimeText: '演示有效期',
                    enable: 1,
                  },
                ]
              : []),
          ],
          currentPage: 1,
          totalPages: 1,
          totalCount: this.claimed ? 2 : 1,
        };
        break;
      case 'query-store-coupons':
        data = [];
        break;
      case 'query-lottery-info':
        data = {
          activityCode: 'DEMO-LOTTERY',
          activityName: '麦麦惊喜站 · 演示',
          activityStatusText: '演示活动',
          availablePoint: String(this.points),
          availableTimes: 0,
          drawPoint: '24',
          drawDecision: {
            resourceEligible: this.points >= 24,
            reason: this.points < 24 ? '演示积分不足' : null,
            nextConsumption: {
              type: 'POINTS',
              points: '24',
              chances: 0,
              text: '本次消耗 24 演示积分',
            },
            fallbackConsumption: null,
          },
          prizes: [
            { name: '示例餐品券', typeText: '演示奖品' },
            { name: '示例周边', typeText: '演示奖品' },
          ],
        };
        break;
      case 'draw-lottery':
        if (this.points < 24) throw new Error('演示积分不足');
        this.points -= 24;
        data = {
          consumePoint: '24',
          remainPoint: String(this.points),
          win: false,
          prizes: [],
          status: { code: 'SUCCESS', message: '演示抽奖已完成，没有产生真实积分扣减。' },
        };
        break;
      case 'query-my-prizes':
        data = { prizes: [], pageNum: 1, hasMore: false };
        break;
      case 'mall-points-products':
        data = [
          {
            spuId: 1,
            spuName: '一杯小小的快乐',
            selling: '虚构商品，用于体验积分兑换流程',
            shopId: 2,
            catName: '演示餐品券',
            point: '200',
            price: '0',
            status: 2,
          },
          {
            spuId: 2,
            spuName: '周末趣读派对',
            selling: '虚构活动，用于体验城市与场次探索',
            shopId: 5,
            catName: '演示主题活动',
            point: '0',
            price: '49',
            status: 2,
          },
        ].filter(
          (p) => !a.catRuleIds || (a.catRuleIds.includes('1>6') ? p.shopId === 5 : p.shopId === 2),
        );
        break;
      case 'mall-product-detail':
        data = {
          spuId: a.spuId,
          spuName: a.spuId === 2 ? '周末趣读派对 · 演示' : '一杯小小的快乐 · 演示',
          shopId: a.spuId === 2 ? 5 : 2,
          spuCategory: '1',
          partyType: -1,
          partyPeople: '演示场次，以实际接口为准',
          note: '这是演示商品，不会产生真实权益或订单。真实商品的购买须知将在此原文展示。',
          skuList: [
            {
              skuId: a.spuId === 2 ? 202 : 101,
              points: a.spuId === 2 ? '0' : '200',
              price: a.spuId === 2 ? '49' : '0',
              extTradePrice: '0',
              specList: [{ specMain: '规格', specItem: '演示体验' }],
            },
          ],
        };
        break;
      case 'mall-create-order': {
        const cost = 200 * a.count;
        if (this.points < cost) throw new Error('演示积分不足');
        this.points -= cost;
        data = {
          orderId: `DEMO-MALL-${Date.now()}`,
          status: 1,
          point: cost,
          amount: '0',
          coupons: [],
        };
        this.mallOrders.unshift({
          orderId: data.orderId,
          orderStatusTitle: '演示兑换成功',
          goods: [{ spuName: '一杯小小的快乐 · 演示' }],
        });
        break;
      }
      case 'mall-order-list':
        data = [{ list: this.mallOrders, hasNext: false }];
        break;
      case 'mall-order-detail':
        data = {
          orderId: a.orderId,
          orderStatusTitle: '演示兑换订单',
          goods: [{ spuName: '一杯小小的快乐 · 演示' }],
        };
        break;
      case 'campaign-calendar':
        data = {
          currentTime: new Date().toISOString(),
          dailyList: [
            {
              date: a.specifiedDate ?? today(),
              today: true,
              events: [
                {
                  articleDto: {
                    title: '把今天，过成小小的节日',
                    content: '去发现一家餐厅，挑一道没尝过的餐品。这个活动是麦游记演示内容。',
                  },
                  eventType: 4,
                },
                {
                  articleDto: {
                    title: '周末趣读派对 · 演示',
                    content: '为周末留一段一起阅读的时间。请前往活动探索选择场次。',
                  },
                  eventType: 4,
                },
              ],
            },
          ],
        };
        break;
      case 'delivery-query-addresses':
        data = { addresses: this.address };
        break;
      case 'delivery-create-address':
        data = {
          addressId: `DEMO-ADDR-${Date.now()}`,
          contactName: a.contactName,
          phone: a.phone,
          fullAddress: `${a.city}${a.address}${a.addressDetail}`,
        };
        this.address.push(data);
        break;
      case 'query-party-city':
        data = [{ code: 310100, name: '上海市 · 演示', latitude: 31.23, longitude: 121.47 }];
        break;
      case 'query-party-store':
        data = [{ code: '1450713', name: '华旭国际大厦餐厅 · 演示', address: '西藏中路336号' }];
        break;
      case 'query-party-store-date':
        data = [{ date: today(), storeCode: '1450713', spuId: 2 }];
        break;
      case 'query-party-store-session':
        data = [
          {
            id: 1,
            timeStart: '15:00',
            timeEnd: '16:30',
            leftNum: 12,
            price: 49,
            partyMin: 1,
            partyMax: 12,
          },
        ];
        break;
      case 'party-order-create':
        data = {
          orderId: `DEMO-PARTY-${Date.now()}`,
          amount: String(49 * a.count),
          status: 1,
          goods: [{ spuName: '周末趣读派对 · 演示', count: a.count }],
        };
        break;
      case 'query-promotions':
        data = [];
        break;
      case 'query-meal-assistance':
        data = {
          mealAssistanceItems: [
            {
              gmServiceCode: 'DEMO-SERVICE',
              gmServiceName: '常规配送 · 演示',
              enable: true,
              serviceItems: ['演示助餐服务，不提供实际配送'],
            },
          ],
        };
        break;
      case 'query-survey-coupon':
        data = { trade_no: a.orderId, satisfaction_description: '演示模式没有真实满意度答卷' };
        break;
      default:
        throw new Error('该演示工具尚不可用');
    }
    return { code: 200, message: '演示数据，非实时权益或价格', data };
  }
}
export const publicSnapshot = {
  capturedAt: snapshot.capturedAt,
  storeCode: snapshot.storeCode,
  menuCount: meals.length,
};
