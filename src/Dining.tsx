import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Store,
  Truck,
  Car,
  Users,
  ShoppingBag,
  ArrowRight,
  Check,
  SlidersHorizontal,
  Leaf,
  Bookmark,
  Trash2,
  CalendarClock,
  Ticket,
  Plus,
} from 'lucide-react';
import { useApp, useResource } from './state';
import { tool } from './api';
import {
  contextArgs,
  buildMealItem,
  money,
  normalizeNutrition,
  nutritionFor,
  type Bag,
  type Meal,
  type Context,
} from '../shared/domain';
import {
  Sheet,
  PageTitle,
  MealCard,
  ResourceStatus,
  Empty,
  Quantity,
  FoodImage,
  DataView,
} from './ui';
export function StorePicker({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const demo = a.session?.mode === 'demo';
  const [kind, setKind] = useState<1 | 2 | 5 | 6>(a.context?.beType ?? 1);
  const [city, setCity] = useState(demo ? '上海市' : '');
  const [keyword, setKeyword] = useState(demo ? '人民广场' : '');
  const [stores, setStores] = useState<Bag[] | null>(null);
  const [selectedAddress, setAddress] = useState('');
  const [selected, setSelected] = useState<Bag | null>(null);
  const [reservation, setReservation] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [createAddress, setCreateAddress] = useState(false);
  const addresses = useResource('delivery-query-addresses', {}, [2, 6].includes(kind), a.revision);
  function changeKind(k: 1 | 2 | 5 | 6) {
    setKind(k);
    setStores(null);
    setSelected(null);
    setAddress('');
    setReservation('');
    setScheduled(false);
  }
  async function search(favorite = false) {
    setSelected(null);
    setStores(null);
    if ([1, 5].includes(kind)) {
      if (!favorite && (!city.trim() || !keyword.trim())) {
        a.toast('请填写城市和位置关键词');
        return;
      }
      await a.run(
        () =>
          tool('query-nearby-stores', {
            beType: kind,
            searchType: favorite ? 1 : 2,
            ...(!favorite ? { city: city.trim(), keyword: keyword.trim() } : {}),
          }),
        (r) => setStores(Array.isArray(r.result) ? r.result : []),
      );
    } else {
      if (!selectedAddress) {
        a.toast('请先选择配送地址');
        return;
      }
      await a.run(
        () => tool('delivery-query-stores', { addressId: selectedAddress, beType: kind }),
        (r) => setStores(Array.isArray(r.result) ? r.result : []),
      );
    }
  }
  function choose() {
    if (!selected) return;
    if (scheduled && !reservation) {
      a.toast('请选择预约日期和时间');
      return;
    }
    a.selectContext({
      storeCode: selected.storeCode,
      storeName: selected.storeName,
      beType: kind,
      orderType: [1, 5].includes(kind) ? 1 : 2,
      ...(kind !== 1 ? { beCode: selected.beCode } : {}),
      ...([2, 6].includes(kind) ? { addressId: selectedAddress } : {}),
      ...(scheduled ? { reservationDate: reservation.replace('T', ' ') } : {}),
    });
    onClose();
  }
  return (
    <Sheet title="下一站，去哪儿吃？" onClose={onClose} wide>
      <p className="muted small">切换门店或取餐方式会清空当前餐袋。</p>
      <div className="mode-grid">
        {(
          [
            [1, Store, '到店自取'],
            [2, Truck, '麦乐送'],
            [5, Car, '得来速'],
            [6, Users, '企业团餐'],
          ] as const
        ).map(([k, Icon, label]) => (
          <button
            key={k}
            className={`mode-choice ${kind === k ? 'selected' : ''}`}
            onClick={() => changeKind(k)}
          >
            <Icon size={23} />
            {label}
          </button>
        ))}
      </div>
      {[1, 5].includes(kind) ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="stack"
        >
          <label>
            城市
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="例如：上海市"
            />
          </label>
          <label>
            附近位置
            <input
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="商圈、学校或街道"
            />
          </label>
          <div className="button-row">
            <button className="button primary" disabled={a.busy}>
              <Search size={17} />
              查找门店
            </button>
            <button type="button" className="button secondary" onClick={() => void search(true)}>
              收藏的门店
            </button>
          </div>
        </form>
      ) : (
        <div className="stack">
          <ResourceStatus resource={addresses}>
            <label>
              配送到
              <select
                value={selectedAddress}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setStores(null);
                }}
              >
                <option value="">请选择配送地址</option>
                {(addresses.data?.addresses ?? []).map((ad: Bag) => (
                  <option key={ad.addressId} value={ad.addressId}>
                    {ad.contactName} · {ad.fullAddress}
                  </option>
                ))}
              </select>
            </label>
          </ResourceStatus>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => void search()}
              disabled={a.busy || !selectedAddress}
            >
              查询可配送门店
            </button>
            <button className="button secondary" onClick={() => setCreateAddress(true)}>
              <Plus size={16} />
              新增地址
            </button>
          </div>
          {kind === 6 && <p className="hint">企业团餐可在餐袋中选择助餐服务、查看促销规则。</p>}
        </div>
      )}
      {a.busy && (
        <p className="muted small" role="status">
          正在查询…
        </p>
      )}
      {stores && (
        <div className="store-list">
          {stores.length === 0 ? (
            <Empty title="暂时没有找到门店" text="可以换个关键词，或查看其他取餐方式。" />
          ) : (
            stores.map((s, i) => (
              <button
                key={`${s.storeCode}-${i}`}
                className={`store-card ${selected?.storeCode === s.storeCode ? 'selected' : ''}`}
                onClick={() => {
                  setSelected(s);
                  setScheduled(false);
                  setReservation('');
                }}
              >
                <div className="title-row">
                  <strong>{s.storeName}</strong>
                  {selected?.storeCode === s.storeCode && <Check size={18} />}
                </div>
                {s.address && <p>{s.address}</p>}
                <p className="small">
                  {s.businessStatus ? '营业中' : '暂不营业 / 可查看预约'}
                  {s.distance ? ` · 距搜索位置 ${s.distance} 米` : ''} · {s.businessStartTime}–
                  {s.businessEndTime}
                </p>
                <p className="micro">
                  门店编号 {s.storeCode}
                  {s.beCode ? ` · 业务编码 ${s.beCode}` : ''}
                </p>
              </button>
            ))
          )}
        </div>
      )}
      {selected && (
        <div className="booking-box stack">
          <h3>取餐时间</h3>
          <label className="check-row">
            <input
              type="checkbox"
              checked={scheduled}
              onChange={(e) => setScheduled(e.target.checked)}
              disabled={!selected.reservation}
            />
            预约取餐 / 送达
          </label>
          {selected.reservation && (
            <div className="reservation-times">
              {(selected.reservationTimeOptions ?? []).map((r: Bag, i: number) => (
                <p key={i}>
                  <strong>
                    {r.date}
                    {r.today ? '（今天）' : ''}
                  </strong>
                  <br />
                  {r.reservationOptionText}
                </p>
              ))}
            </div>
          )}
          {scheduled && (
            <label>
              在以上可选时段内选择
              <input
                type="datetime-local"
                value={reservation}
                onChange={(e) => setReservation(e.target.value)}
                required
              />
            </label>
          )}
          <button
            className="button primary full"
            disabled={!scheduled && !selected.businessStatus}
            onClick={choose}
          >
            就去这里
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      {createAddress && (
        <AddressForm
          onClose={() => setCreateAddress(false)}
          onSaved={() => {
            addresses.reload();
            a.refresh();
          }}
        />
      )}
    </Sheet>
  );
}
export function AddressForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const a = useApp();
  const [form, setForm] = useState<Bag>({
    city: '',
    contactName: '',
    gender: '',
    phone: '',
    address: '',
    addressDetail: '',
  });
  const fields = [
    ['city', '城市', '上海市'],
    ['contactName', '联系人', '你的姓名'],
    ['phone', '手机号', '11 位手机号'],
    ['address', '街道与小区', '道路 / 小区 / 楼栋'],
    ['addressDetail', '门牌号', '单元 / 楼层 / 房间'],
  ];
  return (
    <Sheet title="新增配送地址" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void a.action('delivery-create-address', form, () => {
            onSaved();
            onClose();
          });
        }}
      >
        {fields.map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <input
              required
              value={form[key]}
              placeholder={placeholder}
              type={key === 'phone' ? 'tel' : 'text'}
              maxLength={key === 'phone' ? 11 : 100}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label>
          称呼
          <select
            required
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
          >
            <option value="">请选择</option>
            <option>先生</option>
            <option>女士</option>
          </select>
        </label>
        <button className="button primary full" disabled={a.busy}>
          预览并确认地址
        </button>
      </form>
    </Sheet>
  );
}
function Modifiers({
  items,
  values,
  onChange,
}: {
  items: Bag[];
  values: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  return (
    <div className="modifiers">
      {items.map((g, gi) => (
        <fieldset key={gi}>
          <legend>
            特调组 {gi + 1} · 选 {g.minValues ?? 0}–{g.maxValues ?? '不限'} 项
          </legend>
          {(g.values ?? []).map((v: Bag, vi: number) => {
            const key = `${gi}:${vi}`;
            const q = values[key] ?? v.selectedQuantity ?? 0;
            return (
              <div className="modifier-row" key={key}>
                <span>
                  {v.name}
                  {v.price > 0 && <small> +{money(v.price)}</small>}
                </span>
                <Quantity
                  value={q}
                  max={v.maxQuantity < 0 ? 99 : (v.maxQuantity ?? 1)}
                  onChange={(n) => {
                    let next = { ...values, [key]: n };
                    if (g.maxValues === 1 && n > 0)
                      next = {
                        ...Object.fromEntries(
                          (g.values ?? []).map((_: Bag, i: number) => [`${gi}:${i}`, 0]),
                        ),
                        ...values,
                        [key]: n,
                      };
                    if (g.maxValues === 1 && n > 0)
                      for (let i = 0; i < (g.values ?? []).length; i++)
                        if (i !== vi) next[`${gi}:${i}`] = 0;
                    onChange(next);
                  }}
                  label={v.name}
                />
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
export function MealDetail({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const a = useApp();
  const context = a.context!;
  const d = useResource('query-meal-detail', { ...contextArgs(context), code: meal.code });
  const nutrition = useResource('list-nutrition-foods');
  const [selections, setSelections] = useState<Record<string, Record<string, number>>>({});
  const [mods, setMods] = useState<Record<string, Record<string, number>>>({});
  const [showMods, setShowMods] = useState<Record<string, boolean>>({});
  const [quantity, setQuantity] = useState(1);
  const n = nutritionFor(d.data?.name ?? meal.name, normalizeNutrition(nutrition.data));
  function add() {
    try {
      const item = buildMealItem(d.data, selections, mods);
      const parts = (d.data.rounds ?? []).flatMap((r: Bag) =>
        (r.choices ?? [])
          .filter(
            (c: Bag) =>
              (selections[r.id]?.[c.code] ?? (c.isDefault === 1 ? (c.quantity ?? 1) : 0)) > 0,
          )
          .map((c: Bag) => c.name),
      );
      const changes: string[] = [];
      const describe = (items: Bag[], v: Record<string, number>, label: string) => {
        for (const [gi, g] of items.entries()) {
          const changed = (g.values ?? []).some(
            (x: Bag, vi: number) =>
              (v[`${gi}:${vi}`] ?? x.selectedQuantity ?? 0) !== (x.selectedQuantity ?? 0),
          );
          if (!changed) continue;
          for (const [vi, x] of (g.values ?? []).entries()) {
            const q = v[`${gi}:${vi}`] ?? x.selectedQuantity ?? 0;
            const old = x.selectedQuantity ?? 0;
            if (q > 0 && (g.maxValues === 1 || q !== old)) changes.push(`${label}${x.name}`);
            else if (q === 0 && old > 0 && g.maxValues !== 1) changes.push(`${label}去掉${x.name}`);
          }
        }
      };
      describe(d.data.modification?.items ?? [], mods.main ?? {}, '');
      for (const r of d.data.rounds ?? [])
        for (const c of r.choices ?? [])
          if ((selections[r.id]?.[c.code] ?? (c.isDefault === 1 ? (c.quantity ?? 1) : 0)) > 0)
            describe(c.modification?.items ?? [], mods[`${r.id}:${c.code}`] ?? {}, `${c.name}：`);
      a.addLine({
        meal,
        quantity,
        item: { ...item, quantity },
        description: [parts.length ? parts.join(' · ') : '标准配方', ...changes].join(' / '),
      });
      onClose();
    } catch (e) {
      a.toast((e as Error).message);
    }
  }
  return (
    <Sheet title="这份快乐的细节" onClose={onClose} wide>
      <ResourceStatus resource={d}>
        {d.data && (
          <>
            <FoodImage src={d.data.image ?? meal.image} name={meal.name} className="detail-image" />
            <div className="title-row">
              <h2>
                {d.data.name}
                {d.data.supportModify && <span className="pill">可特调</span>}
              </h2>
              <strong className="price">
                {money(meal.price)}
                <small>起 / 菜单展示价</small>
              </strong>
            </div>
            {d.data.demoDetail && (
              <p className="hint">此商品详情为简化演示。真实模式会读取实际套餐与特调选项。</p>
            )}
            {n ? (
              <div className="nutrition-grid">
                {[
                  ['能量', n.energyKcal, 'kcal'],
                  ['蛋白质', n.protein, 'g'],
                  ['脂肪', n.fat, 'g'],
                  ['钠', n.sodium, 'mg'],
                ].map(([label, value, unit]) => (
                  <div key={String(label)}>
                    <strong>
                      {value ?? '—'}
                      <small>{unit}</small>
                    </strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">
                <Leaf size={15} />
                暂无精确匹配的营养数据
              </p>
            )}
            <p className="micro muted">
              营养数据为标准配方参考；套餐、规格变化与特调后的数值不估算。不用于判断过敏原。
            </p>
            {(d.data.rounds ?? []).map((r: Bag) => {
              const selected =
                selections[r.id] ??
                Object.fromEntries(
                  (r.choices ?? []).map((c: Bag) => [
                    c.code,
                    c.isDefault === 1 ? (c.quantity ?? 1) : 0,
                  ]),
                );
              return (
                <section className="detail-round" key={r.id}>
                  <h3>
                    {r.name}
                    <span className="muted small">
                      选 {r.minQuantity ?? r.quantity ?? 1}–{r.maxQuantity ?? r.quantity ?? 1} 份
                    </span>
                  </h3>
                  {(r.choices ?? []).map((c: Bag) => {
                    const q = selected[c.code] ?? 0;
                    const max = r.maxQuantity ?? r.quantity ?? 1;
                    const single = max === 1;
                    const mk = `${r.id}:${c.code}`;
                    return (
                      <div className={`round-choice ${q ? 'chosen' : ''}`} key={c.code}>
                        <div className="choice-main">
                          <label className="check-row">
                            <input
                              type={single ? 'radio' : 'checkbox'}
                              name={`round-${r.id}`}
                              checked={q > 0}
                              onChange={() =>
                                setSelections((s) => ({
                                  ...s,
                                  [r.id]: single
                                    ? Object.fromEntries(
                                        (r.choices ?? []).map((v: Bag) => [
                                          v.code,
                                          v.code === c.code ? 1 : 0,
                                        ]),
                                      )
                                    : { ...selected, [c.code]: q ? 0 : 1 },
                                }))
                              }
                            />
                            <span>
                              {c.name}
                              {c.supportModify && <small>【可特调】</small>}
                            </span>
                          </label>
                          <small>{c.diffPrice}</small>
                        </div>
                        {!single && q > 0 && (
                          <Quantity
                            label={c.name}
                            value={q}
                            min={1}
                            max={Math.min(max, c.maxQuantity < 0 ? max : (c.maxQuantity ?? max))}
                            onChange={(v) =>
                              setSelections((s) => ({ ...s, [r.id]: { ...selected, [c.code]: v } }))
                            }
                          />
                        )}{' '}
                        {q > 0 && c.supportModify && (
                          <>
                            <button
                              className="text-button small"
                              onClick={() => setShowMods((s) => ({ ...s, [mk]: !s[mk] }))}
                            >
                              <SlidersHorizontal size={14} />
                              {showMods[mk] ? '收起特调' : '查看特调'}
                            </button>
                            {showMods[mk] && (
                              <Modifiers
                                items={c.modification?.items ?? []}
                                values={mods[mk] ?? {}}
                                onChange={(v) => setMods((s) => ({ ...s, [mk]: v }))}
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })}
            {d.data.supportModify && (
              <section className="detail-round">
                <button
                  className="button secondary full"
                  onClick={() => setShowMods((s) => ({ ...s, main: !s.main }))}
                >
                  <SlidersHorizontal size={16} />
                  {showMods.main ? '收起特调' : '查看特调选项'}
                </button>
                {showMods.main && (
                  <Modifiers
                    items={d.data.modification?.items ?? []}
                    values={mods.main ?? {}}
                    onChange={(v) => setMods((s) => ({ ...s, main: v }))}
                  />
                )}
              </section>
            )}
            <div className="sticky-actions">
              <Quantity value={quantity} min={1} max={99} onChange={setQuantity} />
              <button className="button primary" onClick={add}>
                <ShoppingBag size={18} />
                装进餐袋
              </button>
            </div>
          </>
        )}
      </ResourceStatus>
    </Sheet>
  );
}
export function MenuPage({
  openStores,
  openCart,
  openMeal,
}: {
  openStores: () => void;
  openCart: () => void;
  openMeal: (m: Meal) => void;
}) {
  const a = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [sort, setSort] = useState('default');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const categories = ['全部', ...new Set(a.meals.flatMap((m) => m.categories))];
  const shown = a.meals
    .filter(
      (m) =>
        (category === '全部' || m.categories.includes(category)) &&
        m.name.includes(search) &&
        (!onlyLiked || a.favorites.includes(`${a.session?.mode}:${m.code}`)),
    )
    .sort((x, y) => (sort === 'price' ? (x.price ?? Infinity) - (y.price ?? Infinity) : 0));
  return (
    <>
      <PageTitle eyebrow="THE HAPPY MENU" title="点餐" description="熟悉的味道，或者一点新鲜感。" />
      <button className="location-bar" onClick={openStores}>
        <MapPin size={19} />
        <div>
          <strong>{a.context?.storeName ?? '先选一家餐厅'}</strong>
          <small>
            {a.context
              ? `${{ 1: '到店自取', 2: '麦乐送', 5: '得来速', 6: '企业团餐' }[a.context.beType]} · ${a.context.reservationDate ?? '立即取餐'}`
              : '真实菜单跟着门店走'}
          </small>
        </div>
        <Chevron />
      </button>
      {!a.context ? (
        <Empty
          title="你的餐厅，还没选好"
          text="选择门店后，才能看到实时菜单与价格。"
          action={
            <button className="button primary" onClick={openStores}>
              找一家餐厅
            </button>
          }
        />
      ) : (
        <>
          <div className="search-bar">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索想吃的快乐"
              aria-label="搜索餐品"
            />
            <button
              aria-label="仅看收藏"
              className={onlyLiked ? 'active' : ''}
              onClick={() => setOnlyLiked((v) => !v)}
            >
              <Bookmark size={18} />
            </button>
          </div>
          <div className="chips category-chips">
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? 'selected' : ''}`}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="title-row menu-caption">
            <span className="muted small">{shown.length} 份快乐待探索</span>
            <select aria-label="餐品排序" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">菜单顺序</option>
              <option value="price">价格从低到高</option>
            </select>
          </div>
          <ResourceStatus resource={a.menu} empty={!shown.length}>
            <div className="meal-grid">
              {shown.map((m) => (
                <MealCard key={m.code} meal={m} onClick={() => openMeal(m)} />
              ))}
            </div>
          </ResourceStatus>
          <p className="micro muted page-foot">
            菜单展示价可能受规格、会员与优惠影响，最终费用请在餐袋中核价。
          </p>
        </>
      )}
      {a.cart.length > 0 && (
        <button className="floating-cart" onClick={openCart}>
          <span className="cart-icon">
            <ShoppingBag size={22} />
            <i>{a.cart.reduce((n, l) => n + l.quantity, 0)}</i>
          </span>
          <span>
            快乐已装袋<small>点开核价 · 选券 · 保存餐单</small>
          </span>
          <ArrowRight size={22} />
        </button>
      )}
    </>
  );
}
const Chevron = () => <ArrowRight size={18} />;
export function CartSheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const [quoted, setQuoted] = useState(false);
  const [tableware, setTableware] = useState(false);
  const [remark, setRemark] = useState('');
  const [takeWay, setTakeWay] = useState('');
  const [service, setService] = useState(a.context?.gmServiceCode ?? '');
  const [showPromotions, setShowPromotions] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const args = {
    ...(a.context ? contextArgs(a.context) : {}),
    items: a.cart.map((l) => ({ ...l.item, quantity: l.quantity })),
    needTableware: tableware,
    ...(service ? { gmServiceCode: service } : {}),
  };
  const pricing = useResource('calculate-price', args, quoted && !!a.cart.length && !!a.context);
  const coupons = useResource(
    'query-store-coupons',
    a.context ? contextArgs(a.context) : {},
    !!a.context,
  );
  const assistance = useResource(
    'query-meal-assistance',
    a.context ? contextArgs(a.context) : {},
    a.context?.beType === 6,
  );
  const promotions = useResource(
    'query-promotions',
    a.context ? contextArgs(a.context) : {},
    showPromotions && a.context?.beType === 6,
  );
  useEffect(() => {
    setQuoted(false);
    setTakeWay('');
  }, [a.cart, tableware, service, a.context]);
  function save() {
    if (!a.context || !a.cart.length) return;
    const r = {
      id: crypto.randomUUID(),
      name: recipeName.trim() || '我的快乐餐单',
      codes: a.cart.map((l) => l.meal.code),
      quantities: a.cart.map((l) => l.quantity),
      beType: a.context.beType,
      mode: a.session!.mode,
      storeCode: a.context.storeCode,
      date: new Date().toISOString(),
    };
    a.setRecipes((s) => [r, ...s].slice(0, 50));
    a.toast('餐单已放进护照，重建时会重新读取默认搭配');
  }
  return (
    <Sheet title="我的快乐餐袋" onClose={onClose} wide>
      {!a.cart.length ? (
        <Empty
          title="餐袋里还没有快乐"
          action={
            <button className="button primary" onClick={onClose}>
              去挑点好吃的
            </button>
          }
        />
      ) : (
        <>
          <p className="muted small">{a.context?.storeName}</p>
          {a.cart.map((line) => (
            <div className="cart-line" key={line.id}>
              <FoodImage src={line.meal.image} name={line.meal.name} />
              <div className="cart-line-info">
                <strong>{line.meal.name}</strong>
                <p>{line.description}</p>
                <small>菜单参考 {money(line.meal.price)} / 份</small>
                <Quantity
                  value={line.quantity}
                  min={1}
                  onChange={(n) =>
                    a.setCart((c) => c.map((l) => (l.id === line.id ? { ...l, quantity: n } : l)))
                  }
                  label={line.meal.name}
                />
                <label className="coupon-select">
                  <Ticket size={14} />
                  <select
                    aria-label={`为${line.meal.name}选择优惠券`}
                    value={line.item.couponId ?? ''}
                    onChange={(e) => {
                      const coupon = (coupons.data ?? []).find(
                        (c: Bag) => c.couponId === e.target.value,
                      );
                      a.setCart((c) =>
                        c.map((l) => {
                          if (l.id !== line.id) return l;
                          const { couponId, couponCode, ...rest } = l.item;
                          return {
                            ...l,
                            item: {
                              ...rest,
                              ...(coupon
                                ? { couponId: coupon.couponId, couponCode: coupon.couponCode }
                                : {}),
                            },
                          };
                        }),
                      );
                    }}
                  >
                    <option value="">不用优惠券</option>
                    {(coupons.data ?? [])
                      .filter((c: Bag) =>
                        c.products?.some((p: Bag) => p.productCode === line.meal.code),
                      )
                      .map((c: Bag) => (
                        <option key={c.couponId} value={c.couponId}>
                          {c.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <button
                className="icon-button"
                aria-label={`移除${line.meal.name}`}
                onClick={() => a.setCart((c) => c.filter((l) => l.id !== line.id))}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
          {coupons.loading ? (
            <p className="micro muted">正在查询门店可用券…</p>
          ) : coupons.error ? (
            <p className="hint">
              优惠券查询未完成：{coupons.error}
              <button onClick={coupons.reload} className="text-button">
                重试
              </button>
            </p>
          ) : (
            <p className="micro muted">仅显示关联本餐品的门店券，实际能否用券以官方核价为准。</p>
          )}
          {a.context?.beType === 6 && (
            <div className="stack booking-box">
              <ResourceStatus resource={assistance}>
                <label>
                  助餐服务
                  <select value={service} onChange={(e) => setService(e.target.value)}>
                    <option value="">请选择助餐服务</option>
                    {(Array.isArray(assistance.data)
                      ? assistance.data
                      : (assistance.data?.mealAssistanceItems ?? [])
                    ).map((s: Bag) => (
                      <option
                        key={s.gmServiceCode ?? s.code}
                        value={s.gmServiceCode ?? s.code}
                        disabled={s.enable === false}
                      >
                        {s.gmServiceName ?? s.name}
                        {s.unusableReason ? ` · ${s.unusableReason}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {(assistance.data?.mealAssistanceItems ?? [])
                  .filter((s: Bag) => s.gmServiceCode === service)
                  .map((s: Bag) => (
                    <div key={s.gmServiceCode} className="hint">
                      {(s.serviceItems ?? []).join(' · ')}
                      {s.unusableReason}
                    </div>
                  ))}
              </ResourceStatus>
              <button className="text-button" onClick={() => setShowPromotions((v) => !v)}>
                查看团餐促销规则
              </button>
              {showPromotions && (
                <ResourceStatus resource={promotions}>
                  <DataView value={promotions.data} />
                </ResourceStatus>
              )}
            </div>
          )}
          <div className="stack cart-options">
            <label className="check-row">
              <input
                type="checkbox"
                checked={tableware}
                onChange={(e) => setTableware(e.target.checked)}
              />
              需要餐具（可能产生餐具费）
            </label>
            {a.context?.orderType === 2 && (
              <label>
                配送备注
                <input
                  maxLength={50}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="例如：无接触配送（最多50字）"
                />
              </label>
            )}
          </div>
          <button
            className="button primary full"
            onClick={() => {
              setQuoted(true);
              if (quoted) pricing.reload();
            }}
            disabled={pricing.loading || (a.context?.beType === 6 && !service)}
          >
            看看这一餐多少钱
          </button>
          {quoted && (
            <ResourceStatus resource={pricing}>
              {pricing.data && (
                <div className="quote-box">
                  <span className="eyebrow">
                    {a.session?.mode === 'demo'
                      ? 'DEMO QUOTE · 演示试算'
                      : 'OFFICIAL QUOTE · 官方核价'}
                  </span>
                  <div className="quote-total">{money(pricing.data.price)}</div>
                  {[
                    ['餐品', pricing.data.productPrice],
                    ['配送费', pricing.data.deliveryPrice],
                    ['打包费', pricing.data.packingPrice],
                    ['餐具费', pricing.data.tablewarePrice],
                    ['优惠', pricing.data.discount],
                  ].map(([label, value]) =>
                    value != null ? (
                      <div className="line-between" key={String(label)}>
                        <span>{label}</span>
                        <span>{money(Number(value))}</span>
                      </div>
                    ) : null,
                  )}
                  {a.context?.orderType === 1 && (
                    <label>
                      取餐方式
                      <select value={takeWay} onChange={(e) => setTakeWay(e.target.value)}>
                        <option value="">请选择</option>
                        {(pricing.data.takeWayList ?? []).map((t: Bag) => (
                          <option key={t.code} value={t.code}>
                            {t.title}
                            {t.subtitle ? ' · ' + t.subtitle : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="button dark full"
                    disabled={a.busy || (a.context?.orderType === 1 && !takeWay)}
                    onClick={() =>
                      void a.action(
                        'create-order',
                        {
                          ...args,
                          ...(a.context?.orderType === 1 ? { takeWayCode: takeWay } : {}),
                          ...(a.context?.addressId ? { addressId: a.context.addressId } : {}),
                          ...(remark ? { remark } : {}),
                        },
                        () => {
                          a.setCart([]);
                          onClose();
                        },
                      )
                    }
                  >
                    预览订单并确认
                    <ArrowRight size={17} />
                  </button>
                  <p className="micro muted">确认前会再次核价；价格变化会要求重新确认。</p>
                </div>
              )}
            </ResourceStatus>
          )}
          <div className="save-recipe">
            <h3>
              <Bookmark size={17} />
              这一餐，下次还想吃
            </h3>
            <p className="small muted">
              保存餐品清单；重建时使用当时默认搭配，不保存优惠券与价格。
            </p>
            <div className="button-row">
              <input
                value={recipeName}
                maxLength={30}
                placeholder="给餐单起个小名字"
                onChange={(e) => setRecipeName(e.target.value)}
              />
              <button className="button secondary" onClick={save}>
                保存
              </button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
