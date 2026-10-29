import React, { useState } from 'react';
import {
  Ticket,
  Gift,
  Coins,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Package,
  CalendarDays,
  Award,
  Search,
  Plus,
  ChevronLeft,
  MapPin,
  Check,
  Users,
  Leaf,
} from 'lucide-react';
import { useApp, useResource } from './state';
import { tool } from './api';
import {
  Sheet,
  PageTitle,
  SectionTitle,
  ResourceStatus,
  Empty,
  Quantity,
  FoodImage,
  DataView,
  PaymentLink,
} from './ui';
import { AddressForm } from './Dining';
import { money, statusName, normalizeNutrition, type Bag } from '../shared/domain';
export function Wallet({
  openLottery,
  openOrders,
  openParty,
  openNutrition,
}: {
  openLottery: () => void;
  openOrders: () => void;
  openParty: () => void;
  openNutrition: () => void;
}) {
  const a = useApp();
  const [section, setSection] = useState('我的券');
  const [page, setPage] = useState(1);
  const [mall, setMall] = useState(false);
  const [claim, setClaim] = useState(false);
  const [prizes, setPrizes] = useState(false);
  const account = useResource('query-my-account', {}, true, a.revision);
  const coupons = useResource(
    'query-my-coupons',
    { page: String(page), pageSize: '20' },
    section === '我的券',
    a.revision,
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR LITTLE TREASURY"
        title="快乐，也要精打细算。"
        description="积分、好券、小惊喜，都在这里。"
        action={
          <button className="icon-button" aria-label="刷新钱包" onClick={a.refresh}>
            <RefreshCw size={20} />
          </button>
        }
      />
      <section className="wallet-card">
        <span className="eyebrow">
          {a.session?.mode === 'demo' ? 'DEMO POINTS · 演示积分' : 'MY MCD POINTS'}
        </span>
        <ResourceStatus resource={account}>
          <div className="points-number">
            {account.data?.availablePoint ?? '—'}
            <span>积分</span>
          </div>
          <div className="point-expiry">
            <ClockIcon />
            本月将到期 {account.data?.currentMouthExpirePoint ?? '未知'} 积分
          </div>
        </ResourceStatus>
        <div className="wallet-links">
          <button onClick={() => setMall(true)}>
            去兑换
            <ArrowUpRight size={17} />
          </button>
          <button onClick={openLottery}>
            看看抽奖
            <Gift size={17} />
          </button>
        </div>
        <div className="wallet-orbit" />
        <Coins className="wallet-decoration" size={100} strokeWidth={1} />
      </section>
      <div className="wallet-shortcuts">
        {[
          { Icon: Ticket, name: '麦麦省领券', click: () => setClaim(true) },
          { Icon: Package, name: '我的订单', click: openOrders },
          { Icon: Award, name: '我的奖品', click: () => setPrizes(true) },
          { Icon: Leaf, name: '营养对照', click: openNutrition },
        ].map(({ Icon, name, click }) => (
          <button key={name} onClick={click}>
            <Icon size={22} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="section-title">
        <h2>我的好券</h2>
        <span className="muted small">{coupons.data?.totalCount ?? '—'} 张在卡包</span>
      </div>
      <p className="micro muted">卡包中的券不保证能用于当前订单，点餐时会按门店重新查询。</p>
      <ResourceStatus resource={coupons} empty={!coupons.data?.coupons?.length}>
        <div className="coupon-list">
          {(coupons.data?.coupons ?? []).map((c: Bag) => (
            <article className="coupon-card" key={c.id}>
              <span className="coupon-badge">
                <Ticket size={27} />
              </span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.subtitle || c.discountInfo?.discountDesc || '快乐优惠，随时看看'}</p>
                <small>
                  {c.datetimeText || `${c.tradeStartDate ?? ''} – ${c.tradeEndDate ?? ''}`}
                </small>
                <div className="coupon-tags">
                  {(c.tags ?? []).map((t: Bag, i: number) => (
                    <span key={i}>{t.label}</span>
                  ))}
                </div>
              </div>
              <button
                className="coupon-go"
                onClick={() => a.setTab('menu')}
                aria-label={`查看菜单使用${c.title}`}
              >
                <ArrowUpRight size={18} />
              </button>
            </article>
          ))}
        </div>
        {(coupons.data?.totalPages ?? 1) > 1 && (
          <div className="pagination">
            <button
              className="button secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </button>
            <span>
              {page} / {coupons.data.totalPages}
            </span>
            <button
              className="button secondary"
              disabled={page >= Math.min(coupons.data.totalPages, 5)}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </ResourceStatus>
      <button className="mini-banner lavender full" onClick={openParty}>
        <CalendarDays size={25} />
        <span>
          <strong>给周末，约一场小聚</strong>
          <small>发现派对、品鉴会与更多主题活动</small>
        </span>
        <ArrowUpRight size={19} />
      </button>
      {mall && <MallSheet onClose={() => setMall(false)} />}{' '}
      {claim && <ClaimSheet onClose={() => setClaim(false)} />}{' '}
      {prizes && <PrizesSheet onClose={() => setPrizes(false)} />}
    </>
  );
}
function ClockIcon() {
  return <CalendarDays size={14} />;
}
function ClaimSheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const r = useResource('available-coupons', {}, true, a.revision);
  return (
    <Sheet title="麦麦省 · 领取快乐" onClose={onClose}>
      <ResourceStatus resource={r} empty={!r.data?.length}>
        <div className="stack">
          {(r.data ?? []).map((c: Bag, i: number) => (
            <div className="claim-card" key={i}>
              {c.couponImage && <FoodImage src={c.couponImage} name={c.couponName} />}
              <div>
                <h3>{c.couponName}</h3>
                <span className="pill">{c.label}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          className="button primary full"
          disabled={a.busy || !(r.data ?? []).some((c: Bag) => c.couponStatus === 'CAN_GET')}
          onClick={() => void a.action('auto-bind-coupons', {}, () => r.reload())}
        >
          预览并领取全部可领券
        </button>
      </ResourceStatus>
    </Sheet>
  );
}
export function LotterySheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const r = useResource('query-lottery-info', {}, true, a.revision);
  return (
    <Sheet title="麦麦惊喜站" onClose={onClose}>
      <ResourceStatus resource={r}>
        {r.data && (
          <>
            <div className="lottery-hero">
              <Gift size={64} strokeWidth={1.4} />
              <span className="eyebrow">A LITTLE SURPRISE</span>
              <h2>{r.data.activityName ?? '当前暂无抽奖活动'}</h2>
              <p>{r.data.activityStatusText}</p>
            </div>
            <div className="consumption-card">
              <h3>这一次，会用掉什么？</h3>
              <p>{r.data.drawDecision?.nextConsumption?.text ?? '暂无可用消耗信息'}</p>
              {r.data.drawDecision?.fallbackConsumption && (
                <p>
                  本次优先消耗次数；次数用完后将改为消耗积分。
                  {r.data.drawDecision.fallbackConsumption.text}
                </p>
              )}
              <small>
                当前积分 {r.data.availablePoint ?? '未返回'} · 剩余次数{' '}
                {r.data.availableTimes ?? '未返回'}
              </small>
              {r.data.drawDecision?.reason && <p>{r.data.drawDecision.reason}</p>}
            </div>
            <SectionTitle title="这期有哪些惊喜" />
            <div className="prize-grid">
              {(r.data.prizes ?? []).map((p: Bag, i: number) => (
                <article key={i}>
                  {p.imageUrl ? <FoodImage src={p.imageUrl} name={p.name} /> : <Gift size={28} />}
                  <strong>{p.name}</strong>
                  <small>{p.typeText}</small>
                </article>
              ))}
            </div>
            <button
              className="button primary full"
              disabled={a.busy || r.data.drawDecision?.resourceEligible !== true}
              onClick={() => void a.action('draw-lottery', {}, () => r.reload())}
            >
              查看最新消耗并确认抽一次
            </button>
            <p className="micro muted">
              资源是否满足以服务端决策为准；不代表库存或其他参与资格，不预测中奖概率。
            </p>
          </>
        )}
      </ResourceStatus>
    </Sheet>
  );
}
function PrizesSheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const [page, setPage] = useState(1);
  const r = useResource(
    'query-my-prizes',
    { pageNum: String(page), pageSize: '10' },
    true,
    a.revision,
  );
  return (
    <Sheet title="我的小惊喜" onClose={onClose}>
      <ResourceStatus resource={r} empty={!r.data?.prizes?.length}>
        <div className="stack">
          {(r.data?.prizes ?? []).map((p: Bag) => (
            <article className="prize-row" key={p.id}>
              <Gift size={28} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.statusText}</p>
                <small>
                  {p.timeRemindText} · {p.recordTime}
                </small>
              </div>
            </article>
          ))}
        </div>
      </ResourceStatus>
      <div className="pagination">
        <button
          className="button secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </button>
        <span>第 {page} 页</span>
        <button
          className="button secondary"
          disabled={!r.data?.hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
    </Sheet>
  );
}
export function MallSheet({
  onClose,
  partyOnly = false,
}: {
  onClose: () => void;
  partyOnly?: boolean;
}) {
  const [cat, setCat] = useState(partyOnly ? 'party' : 'all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const r = useResource(
    'mall-points-products',
    cat === 'all'
      ? {}
      : {
          catRuleIds:
            cat === 'party'
              ? '1>6>20,1>6>21,1>6>22,1>6>25,1>6>34,1>6>40'
              : cat === 'goods'
                ? '2'
                : '1>4',
        },
  );
  const shown = (r.data ?? []).filter((p: Bag) => p.spuName?.includes(search));
  return (
    <Sheet title={partyOnly ? '周末，去玩一会儿' : '积分换点小快乐'} onClose={onClose} wide>
      <div className="chips wrap">
        {[
          ['all', '全部'],
          ['coupon', '餐品券'],
          ['goods', '周边与实物'],
          ['party', '主题活动'],
        ].map(([key, name]) => (
          <button
            key={key}
            className={`chip ${cat === key ? 'selected' : ''}`}
            onClick={() => setCat(key)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="search-bar">
        <Search size={17} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="找一份想要的快乐"
          aria-label="搜索积分商品"
        />
      </div>
      <ResourceStatus resource={r} empty={!shown.length}>
        <div className="mall-grid">
          {shown.map((p: Bag) => (
            <button className="mall-card" key={p.spuId} onClick={() => setSelected(p.spuId)}>
              <div className={`mall-image ${p.shopId === 5 ? 'lavender' : 'yellow'}`}>
                {p.spuImage ? (
                  <FoodImage src={p.spuImage} name={p.spuName} />
                ) : p.shopId === 5 ? (
                  <Users size={40} />
                ) : (
                  <Gift size={40} />
                )}
              </div>
              <div className="mall-card-copy">
                <span className="eyebrow">{p.catName ?? '发现新快乐'}</span>
                <h3>{p.spuName}</h3>
                <p>{p.selling}</p>
                <strong>
                  {p.point ?? '—'} 积分{p.price && p.price !== '0' ? ` + ¥${p.price}` : ''}
                </strong>
                <small>
                  {({ 1: '暂未上架', 2: '在售', 3: '已售罄', 4: '已下架', 5: '预热中' } as Bag)[
                    p.status
                  ] ?? '状态待确认'}
                </small>
              </div>
            </button>
          ))}
        </div>
      </ResourceStatus>
      {selected !== null && <MallDetail spuId={selected} onClose={() => setSelected(null)} />}
    </Sheet>
  );
}
function MallDetail({ spuId, onClose }: { spuId: number; onClose: () => void }) {
  const a = useApp();
  const r = useResource('mall-product-detail', { spuId });
  const [skuId, setSku] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [addressId, setAddress] = useState('');
  const [addressForm, setAddressForm] = useState(false);
  const [party, setParty] = useState(false);
  const addresses = useResource(
    'delivery-query-addresses',
    {},
    String(r.data?.spuCategory) === '2',
    a.revision,
  );
  const sku = r.data?.skuList?.find((s: Bag) => s.skuId === skuId);
  return (
    <Sheet title="这份快乐的详情" onClose={onClose} wide>
      <ResourceStatus resource={r}>
        {r.data && (
          <>
            <h2>{r.data.spuName}</h2>
            <p>{r.data.selling}</p>
            {r.data.images?.[0] && (
              <FoodImage src={r.data.images[0]} name={r.data.spuName} className="detail-image" />
            )}
            <div className="sku-list">
              {(r.data.skuList ?? []).map((s: Bag) => (
                <label
                  className={`sku-choice ${skuId === s.skuId ? 'selected' : ''}`}
                  key={s.skuId}
                >
                  <input
                    type="radio"
                    checked={skuId === s.skuId}
                    onChange={() => setSku(s.skuId)}
                    name="sku"
                  />
                  <div>
                    <strong>
                      {s.specList?.map((v: Bag) => `${v.specMain}：${v.specItem}`).join(' / ') ||
                        `规格 ${s.skuId}`}
                    </strong>
                    <p>
                      {s.points ?? '—'} 积分 + ¥{s.price ?? '—'}
                    </p>
                    {s.extTradePrice != null && (
                      <small>使用兑换券时另需支付 ¥{s.extTradePrice}</small>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {r.data.partyPeople && <p className="hint">人数说明：{r.data.partyPeople}</p>}
            {r.data.note && (
              <section className="purchase-note">
                <h3>购买须知（原文）</h3>
                <p className="preline">{r.data.note}</p>
              </section>
            )}
            {r.data.spuLimit?.rule && <p className="hint">{r.data.spuLimit.rule}</p>}
            {r.data.shopId === 5 ? (
              <button
                className="button primary full"
                disabled={!skuId}
                onClick={() => setParty(true)}
              >
                选城市与活动场次
                <ArrowUpRight size={17} />
              </button>
            ) : r.data.shopId === 2 ? (
              <>
                <div className="line-between">
                  <span>兑换数量</span>
                  <Quantity value={count} min={1} onChange={setCount} />
                </div>
                {String(r.data.spuCategory) === '2' && (
                  <div className="stack">
                    <ResourceStatus resource={addresses}>
                      <label>
                        配送地址
                        <select value={addressId} onChange={(e) => setAddress(e.target.value)}>
                          <option value="">请选择地址</option>
                          {(addresses.data?.addresses ?? []).map((ad: Bag) => (
                            <option key={ad.addressId} value={ad.addressId}>
                              {ad.fullAddress} · {ad.contactName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </ResourceStatus>
                    <button className="button secondary" onClick={() => setAddressForm(true)}>
                      <Plus size={16} />
                      新增地址
                    </button>
                  </div>
                )}
                <button
                  className="button primary full"
                  disabled={a.busy || !skuId || (String(r.data.spuCategory) === '2' && !addressId)}
                  onClick={() =>
                    void a.action('mall-create-order', {
                      _spuId: spuId,
                      skuId,
                      spuCategory: String(r.data.spuCategory),
                      count,
                      ...(addressId ? { addressId } : {}),
                    })
                  }
                >
                  预览兑换消耗并确认
                </button>
              </>
            ) : (
              <p className="hint">此商品暂不支持在麦游记下单，请前往麦当劳 App 查看。</p>
            )}
          </>
        )}
      </ResourceStatus>
      {addressForm && (
        <AddressForm onClose={() => setAddressForm(false)} onSaved={addresses.reload} />
      )}{' '}
      {party && sku && (
        <PartyFlow detail={{ ...r.data, spuId }} skuId={skuId!} onClose={() => setParty(false)} />
      )}
    </Sheet>
  );
}
function PartyFlow({
  detail,
  skuId,
  onClose,
}: {
  detail: Bag;
  skuId: number;
  onClose: () => void;
}) {
  const a = useApp();
  const [step, setStep] = useState(0);
  const [type, setType] = useState(0);
  const [city, setCity] = useState<Bag | null>(null);
  const [store, setStore] = useState<Bag | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<Bag | null>(null);
  const [count, setCount] = useState(1);
  const cities = useResource('query-party-city', { spuId: detail.spuId }, step === 1);
  const stores = useResource(
    'query-party-store',
    {
      spuId: detail.spuId,
      code: String(city?.code ?? ''),
      latitude: city?.latitude,
      longitude: city?.longitude,
    },
    step === 2 && !!city,
  );
  const dates = useResource(
    'query-party-store-date',
    { spuId: detail.spuId, storeCode: String(store?.code ?? '') },
    step === 3 && !!store,
  );
  const slots = useResource(
    'query-party-store-session',
    { spuId: detail.spuId, storeCode: String(store?.code ?? ''), dateStr: date },
    step === 4 && !!date,
  );
  const labels = ['场次类型', '选城市', '选门店', '选日期', '选场次', '确认信息'];
  return (
    <Sheet title="周末小聚 · 活动预约" onClose={onClose}>
      <div className="step-progress">
        {labels.map((l, i) => (
          <span key={l} className={step >= i ? 'active' : ''}>
            {i + 1}
          </span>
        ))}
      </div>
      <span className="eyebrow">STEP {step + 1} / 6</span>
      <h2>{labels[step]}</h2>
      <p className="muted small">{detail.spuName}</p>
      {step === 0 && (
        <div className="stack">
          {[1, 2]
            .filter((n) => detail.partyType === -1 || detail.partyType === n)
            .map((n) => (
              <button
                key={n}
                className="selection-card"
                onClick={() => {
                  setType(n);
                  setStep(1);
                }}
              >
                <Users size={24} />
                <span>
                  {n === 1 ? '包场' : '拼团'}
                  <small>选择后继续</small>
                </span>
                <ChevronRight size={20} />
              </button>
            ))}
        </div>
      )}
      {step === 1 && (
        <ResourceStatus resource={cities} empty={!cities.data?.length}>
          {(cities.data ?? []).map((c: Bag) => (
            <button
              className="selection-card"
              key={c.code}
              onClick={() => {
                setCity(c);
                setStore(null);
                setDate('');
                setSlot(null);
                setStep(2);
              }}
            >
              <MapPin size={20} />
              {c.name}
              <ChevronRight size={18} />
            </button>
          ))}
        </ResourceStatus>
      )}
      {step === 2 && (
        <ResourceStatus resource={stores} empty={!stores.data?.length}>
          {(stores.data ?? []).map((s: Bag) => (
            <button
              className="selection-card"
              key={s.code}
              onClick={() => {
                setStore(s);
                setDate('');
                setSlot(null);
                setStep(3);
              }}
            >
              <div>
                <strong>{s.name}</strong>
                <p>{s.address}</p>
                <small>门店编号 {s.code}</small>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </ResourceStatus>
      )}
      {step === 3 && (
        <ResourceStatus resource={dates} empty={!dates.data?.length}>
          {(dates.data ?? []).map((d: Bag) => (
            <button
              className="selection-card"
              key={d.date}
              onClick={() => {
                setDate(d.date);
                setSlot(null);
                setStep(4);
              }}
            >
              <CalendarDays size={20} />
              {d.date}
              <ChevronRight size={18} />
            </button>
          ))}
        </ResourceStatus>
      )}
      {step === 4 && (
        <ResourceStatus resource={slots} empty={!slots.data?.length}>
          {(slots.data ?? []).map((s: Bag) => (
            <button
              className="selection-card"
              key={s.id}
              onClick={() => {
                setSlot(s);
                setStep(5);
              }}
            >
              <div>
                <strong>
                  {s.timeStart}–{s.timeEnd}
                </strong>
                <p>
                  剩余 {s.leftNum ?? '未知'} 位 · 场次展示价 {s.price ?? '未返回'}
                </p>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </ResourceStatus>
      )}
      {step === 5 && slot && (
        <div className="stack">
          <div className="booking-box">
            <p>
              {city?.name} · {store?.name}
            </p>
            <p>
              {date} {slot.timeStart}–{slot.timeEnd}
            </p>
            <p>{type === 1 ? '包场' : '拼团'}</p>
            <p>{detail.partyPeople}</p>
          </div>
          <div className="line-between">
            <label>参加人数</label>
            <Quantity value={count} min={1} max={999} onChange={setCount} />
          </div>
          <p className="micro muted">人数与库存以下单接口校验为准；不会从购买须知推断规则。</p>
          <button
            className="button primary full"
            disabled={a.busy}
            onClick={() =>
              void a.action('party-order-create', {
                spuId: detail.spuId,
                skuId,
                partyType: type,
                code: String(city?.code),
                storeCode: String(store?.code),
                dateStr: date,
                id: slot.id,
                timeStart: slot.timeStart,
                timeEnd: slot.timeEnd,
                leftNum: slot.leftNum,
                count,
                partyTimeInfo: slot,
              })
            }
          >
            预览并确认活动预约
          </button>
        </div>
      )}
      {step > 0 && (
        <button className="button secondary full" onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft size={17} />
          返回上一步
        </button>
      )}
    </Sheet>
  );
}
export function OrdersSheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const [kind, setKind] = useState('food');
  const [cursor, setCursor] = useState<number | undefined>();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('1');
  const [survey, setSurvey] = useState<Bag | null>(null);
  const list = useResource(
    kind === 'food' ? 'order-list' : 'mall-order-list',
    kind === 'food' ? {} : { size: 10, ...(cursor ? { lastId: cursor } : {}) },
    true,
    a.revision,
  );
  const detail = useResource(
    kind === 'food' ? 'query-order' : 'mall-order-detail',
    { orderId: selected },
    !!selected,
    a.revision,
  );
  const shown =
    kind === 'food' ? (list.data?.list ?? []) : (list.data ?? []).flatMap((x: Bag) => x.list ?? []);
  const more = kind === 'mall' && (list.data ?? []).find((x: Bag) => x.hasNext);
  return (
    <Sheet title="我的快乐订单" onClose={onClose} wide>
      <div className="chips">
        <button
          className={`chip ${kind === 'food' ? 'selected' : ''}`}
          onClick={() => {
            setKind('food');
            setSelected(null);
          }}
        >
          点餐订单
        </button>
        <button
          className={`chip ${kind === 'mall' ? 'selected' : ''}`}
          onClick={() => {
            setKind('mall');
            setSelected(null);
          }}
        >
          商城与活动
        </button>
        <button className="icon-button" aria-label="刷新订单" onClick={a.refresh}>
          <RefreshCw size={18} />
        </button>
      </div>
      <ResourceStatus resource={list} empty={!shown.length}>
        <div className="stack">
          {shown.map((o: Bag) => (
            <button
              className="order-card"
              key={o.orderId}
              onClick={() => {
                setSelected(o.orderId);
                setSurvey(null);
              }}
            >
              <div className="line-between">
                <strong>{o.storeName ?? o.orderStatusTitle ?? '麦麦商城订单'}</strong>
                <span className="pill">
                  {kind === 'food' ? statusName(o.orderStatus) : o.orderStatusTitle}
                </span>
              </div>
              <p>
                {(o.orderProductList ?? o.goods ?? [])
                  .map((p: Bag) => p.productName ?? p.spuName ?? p.skuName ?? '商品')
                  .join(' · ')}
              </p>
              <small>
                {o.createTime ?? ''} · 订单 {o.orderId}
              </small>
              {o.realTotalAmount && <strong>¥{o.realTotalAmount}</strong>}
            </button>
          ))}
        </div>
        {kind === 'mall' && (
          <div className="pagination">
            <button
              className="button secondary"
              disabled={!cursor}
              onClick={() => setCursor(undefined)}
            >
              回到首页
            </button>
            <button
              className="button secondary"
              disabled={!more || more.lastId === cursor}
              onClick={() => setCursor(more?.lastId)}
            >
              下一页
            </button>
          </div>
        )}
      </ResourceStatus>
      {selected && (
        <Sheet title="订单详情" onClose={() => setSelected(null)}>
          <ResourceStatus resource={detail}>
            {detail.data && (
              <>
                <DataView value={detail.data} />
                <PaymentLink result={detail.data} />
                {kind === 'food' && (
                  <>
                    <button
                      className="button secondary full"
                      onClick={() =>
                        void a.run(
                          () => tool('query-survey-coupon', { orderId: selected }),
                          (r) => setSurvey(r.result),
                        )
                      }
                    >
                      查询满意度与关联奖券
                    </button>
                    {survey && <DataView value={survey} />}{' '}
                    {['1', '2', '10'].includes(String(detail.data.orderStatus)) && (
                      <div className="stack booking-box">
                        <label>
                          取消原因
                          <select value={reason} onChange={(e) => setReason(e.target.value)}>
                            {[
                              ['1', '改主意了'],
                              ['2', '重复下单'],
                              ['3', '点错了 / 数量不对'],
                              ['4', '地址或电话填错'],
                              ['5', '时间选错'],
                              ['-1', '其他'],
                            ].map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="button danger-button"
                          disabled={a.busy}
                          onClick={() =>
                            void a.action(
                              'cancel-order',
                              { orderId: selected, cancelReasonCode: reason },
                              () => detail.reload(),
                            )
                          }
                        >
                          预览取消订单
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </ResourceStatus>
        </Sheet>
      )}
    </Sheet>
  );
}
export function NutritionSheet({ onClose }: { onClose: () => void }) {
  const r = useResource('list-nutrition-foods');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const rows = normalizeNutrition(r.data);
  const chosen = selected
    .map((name) => rows.find((n) => n.productName === name))
    .filter(Boolean) as Bag[];
  return (
    <Sheet title="营养放大镜" onClose={onClose} wide>
      <p className="muted">把两份餐品并排看看，下一餐更了解自己的选择。</p>
      <div className="search-bar">
        <Search size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索餐品营养"
          aria-label="搜索餐品营养"
        />
      </div>
      {chosen.length > 0 && (
        <div className="nutrition-compare">
          {chosen.map((n) => (
            <article key={n.productName}>
              <h3>{n.productName}</h3>
              {[
                ['能量', n.energyKcal, 'kcal'],
                ['蛋白质', n.protein, 'g'],
                ['脂肪', n.fat, 'g'],
                ['碳水', n.carbohydrate, 'g'],
                ['钠', n.sodium, 'mg'],
                ['钙', n.calcium, 'mg'],
              ].map(([label, v, u]) => (
                <div className="line-between" key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {v ?? '—'} {u}
                  </strong>
                </div>
              ))}
              <button
                className="text-button"
                onClick={() => setSelected((s) => s.filter((x) => x !== n.productName))}
              >
                移除对照
              </button>
            </article>
          ))}
        </div>
      )}
      <ResourceStatus resource={r} empty={!rows.length}>
        <div className="nutrition-table">
          <div className="nutrition-table-head">
            <span>餐品（标准份）</span>
            <span>kcal</span>
            <span>对照</span>
          </div>
          {rows
            .filter((n) => n.productName.includes(search))
            .map((n) => (
              <div key={n.productName}>
                <span>{n.productName}</span>
                <strong>{n.energyKcal ?? '—'}</strong>
                <button
                  className={`icon-button ${selected.includes(n.productName) ? 'active' : ''}`}
                  disabled={!selected.includes(n.productName) && selected.length >= 2}
                  aria-label={`对照${n.productName}`}
                  onClick={() =>
                    setSelected((s) =>
                      s.includes(n.productName)
                        ? s.filter((x) => x !== n.productName)
                        : [...s, n.productName],
                    )
                  }
                >
                  {selected.includes(n.productName) ? <Check size={17} /> : <Plus size={17} />}
                </button>
              </div>
            ))}
        </div>
      </ResourceStatus>
      <p className="micro muted">
        只展示官方已返回的标准配方数据；特调、套餐与其他规格的营养数值不推算。
      </p>
    </Sheet>
  );
}
