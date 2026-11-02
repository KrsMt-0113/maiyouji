import React, { useState } from 'react';
import {
  ArrowUpRight,
  Compass,
  Gift,
  CalendarDays,
  Sparkles,
  Shuffle,
  PackageOpen,
  MapPin,
  ChevronRight,
  Download,
  Star,
  BookOpen,
  Plus,
  Trash2,
  Clock3,
  Users,
} from 'lucide-react';
import { useApp, useResource, type Recipe } from './state';
import { tool } from './api';
import {
  makeInspiration,
  money,
  normalizeNutrition,
  nutritionFor,
  contextArgs,
  buildMealItem,
  type Bag,
  type Meal,
} from '../shared/domain';
import { PageTitle, SectionTitle, MealCard, Sheet, ResourceStatus, Empty, FoodImage } from './ui';
export function Discover({
  openMeal,
  openStores,
  openCalendar,
  openLottery,
  openParty,
}: {
  openMeal: (m: Meal) => void;
  openStores: () => void;
  openCalendar: () => void;
  openLottery: () => void;
  openParty: () => void;
}) {
  const a = useApp();
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
  const featured = ['9900016073', '1100', '1406', '9900004064']
    .map((c) => a.meals.find((m) => m.code === c))
    .filter(Boolean) as Meal[];
  const shown = featured.length ? featured : a.meals.slice(0, 4);
  const heroMeal = a.meals.find((meal) => meal.code === '1100') ?? a.meals[0];
  // Public detail artwork captured in data/meal-details.json; no account data.
  const heroImage =
    heroMeal?.code === '1100'
      ? 'https://menu-img.mcd.cn/pcm/prod/menu/20250611/product/MS_1100_600_1749175370846.png'
      : heroMeal?.image;
  return (
    <>
      <div className="home-greeting">
        <div>
          <span className="discovery-date">{date}</span>
          <h1>发现</h1>
        </div>
      </div>
      <button className="restaurant-row" onClick={openStores}>
        <span className="row-symbol">
          <MapPin size={21} />
        </span>
        <span>
          <strong>{a.context?.storeName || '选择餐厅'}</strong>
          <small>{a.context ? '当前餐厅 · 轻点切换' : '查看附近餐厅与可选菜单'}</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <SectionTitle title="今天吃什么" caption="全部菜单" onClick={() => a.setTab('menu')} />
      {a.context ? (
        <ResourceStatus resource={a.menu} empty={!heroMeal}>
          {heroMeal && (
            <button
              className="today-meal"
              onClick={() => openMeal(heroMeal)}
              aria-label={`今日餐选：${heroMeal.name}`}
            >
              <div className="today-meal-copy">
                <span className="content-kicker">经典餐选</span>
                <h2>{heroMeal.name}</h2>
                <p>熟悉的一口，随时都喜欢。</p>
                <strong>{money(heroMeal.price)}</strong>
              </div>
              <FoodImage src={heroImage} name={heroMeal.name} />
              <span className="today-disclosure">
                <ChevronRight size={18} />
              </span>
            </button>
          )}
        </ResourceStatus>
      ) : (
        <button className="callout" onClick={openStores}>
          <MapPin size={25} />
          <span>选一家餐厅，看看今天的菜单</span>
          <ChevronRight />
        </button>
      )}
      <div className="discovery-pair">
        <button className="discovery-note" onClick={() => a.setTab('inspire')}>
          <span className="note-symbol">
            <Shuffle size={22} />
          </span>
          <strong>换个口味</strong>
          <small>按心情与预算，开一份盲盒</small>
          <span className="note-link">
            找点灵感 <ChevronRight size={14} />
          </span>
        </button>
        <button className="discovery-note" onClick={() => a.setTab('passport')}>
          <span className="note-symbol">
            <BookOpen size={22} />
          </span>
          <strong>记住这一口</strong>
          <small>把喜欢的味道，留在护照里</small>
          <span className="note-link">
            我的护照 <ChevronRight size={14} />
          </span>
        </button>
      </div>
      <SectionTitle title="再看看这些" caption="查看菜单" onClick={() => a.setTab('menu')} />
      {a.context && (
        <ResourceStatus resource={a.menu}>
          <div className="featured-grid">
            {shown.map((m) => (
              <MealCard key={m.code} meal={m} compact onClick={() => openMeal(m)} />
            ))}
          </div>
        </ResourceStatus>
      )}
      <SectionTitle title="活动与体验" />
      <div className="grouped-list">
        {[
          {
            Icon: CalendarDays,
            title: '活动日历',
            detail: '看看接下来有什么',
            click: openCalendar,
            tone: 'red',
          },
          {
            Icon: Gift,
            title: '积分抽奖',
            detail: '先看奖品和参与条件',
            click: openLottery,
            tone: 'purple',
          },
          {
            Icon: Users,
            title: '派对与聚会',
            detail: '寻找城市里的相聚时刻',
            click: openParty,
            tone: 'orange',
          },
        ].map(({ Icon, title, detail, click, tone }) => (
          <button className="grouped-row" key={title} onClick={click}>
            <span className={`list-symbol ${tone}`}>
              <Icon size={19} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
      <p className="page-caption">
        {a.session?.mode === 'demo'
          ? '演示餐品与价格仅供体验；操作不会产生真实订单。'
          : '价格与供应以当前餐厅核价结果为准。'}
      </p>
    </>
  );
}
export function CalendarSheet({ onClose }: { onClose: () => void }) {
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [date, setDate] = useState(dateFmt.format(new Date()));
  const [all, setAll] = useState(false);
  const r = useResource('campaign-calendar', all ? {} : { specifiedDate: date });
  return (
    <Sheet title="快乐活动日历" onClose={onClose} wide>
      <div className="button-row">
        <label className="grow">
          看看这一天
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setAll(false);
            }}
          />
        </label>
        <button className={`button ${all ? 'dark' : 'secondary'}`} onClick={() => setAll(true)}>
          本月全部
        </button>
      </div>
      <ResourceStatus resource={r} empty={!r.data?.dailyList?.length}>
        <div className="calendar-list">
          {(r.data?.dailyList ?? []).map((d: Bag) => (
            <section key={d.date}>
              <h3>
                {d.date}
                <span className="pill">{d.today ? '今天' : (d.dateText ?? '活动日')}</span>
              </h3>
              {(d.events ?? []).map((e: Bag, i: number) => (
                <article className="event-card" key={i}>
                  <span className="eyebrow">
                    {e.eventType === 2 ? 'COUPON' : 'GOOD THINGS AHEAD'}
                  </span>
                  <h3>{e.articleDto?.title || e.activityTitle || '麦麦活动'}</h3>
                  <p className="preline">
                    {e.articleDto?.content || e.activitySubTitle || '详情请前往麦当劳 App 查看。'}
                  </p>
                  {e.price && e.price !== '0' && <strong>¥{e.price} 起</strong>}
                </article>
              ))}
            </section>
          ))}
        </div>
      </ResourceStatus>
      <p className="micro muted">活动文案来自 MCP；开售时间、库存及参加条件以官方页面为准。</p>
    </Sheet>
  );
}
export function Inspiration({
  openMeal,
  openStores,
}: {
  openMeal: (m: Meal) => void;
  openStores: () => void;
}) {
  const a = useApp();
  const [budget, setBudget] = useState(40);
  const [count, setCount] = useState(2);
  const [avoid, setAvoid] = useState('');
  const [mood, setMood] = useState('随心一点');
  const [picks, setPicks] = useState<Meal[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [kind, setKind] = useState('盲盒');
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  React.useEffect(() => setPicks([]), [a.context]);
  function generate(roulette = false) {
    if (!a.meals.length) {
      openStores();
      return;
    }
    const filtered =
      mood === '来点甜的'
        ? a.meals.filter((m) => /派|冰淇淋|麦旋风|新地|奶昔|甜/.test(m.name))
        : mood === '经典老友'
          ? a.meals.filter((m) => /巨无霸|麦辣|板烧|麦香|薯条|可乐/.test(m.name))
          : mood === '尝鲜出发'
            ? a.meals.filter((m) => m.tags.some((t) => /新|限定/.test(t)))
            : a.meals;
    const excluded = [...avoid.split(/[，,、\s]+/).filter(Boolean)];
    setSpinning(true);
    setPicks([]);
    setKind(roulette ? '转盘' : '盲盒');
    timeout.current = setTimeout(() => {
      const next = makeInspiration(filtered, budget * 100, excluded, roulette ? 1 : count);
      setPicks(next);
      setSpinning(false);
      if (!next.length) a.toast('这个预算和筛选下没有候选，试着调整一下');
    }, 900);
  }
  return (
    <>
      <PageTitle
        eyebrow="THE TASTE LAB"
        title="灵感"
        description="选择困难的时候，让一点点随机帮忙。"
      />
      <div className="lab-stage">
        <span className="content-kicker">随心餐选</span>
        {kind === '转盘' ? (
          <div className={`taste-wheel ${spinning ? 'rolling' : ''}`}>
            <div className="wheel-pointer" />
            <div className="wheel-disc">
              {['甜蜜', '经典', '尝鲜', '热爱', '松弛', '惊喜'].map((v, i) => (
                <span
                  key={v}
                  style={{
                    transform: `rotate(${i * 60}deg) translateY(-65px) rotate(-${i * 60}deg)`,
                  }}
                >
                  {v}
                </span>
              ))}
              <Sparkles size={30} />
            </div>
          </div>
        ) : (
          <div className={`mystery-box ${spinning ? 'shaking' : ''}`}>
            <PackageOpen size={68} strokeWidth={1.25} />
            <span>?</span>
            <i className="spark s1">✦</i>
            <i className="spark s2">✳</i>
            <i className="spark s3">+</i>
          </div>
        )}
        <h2>
          {spinning
            ? kind === '转盘'
              ? '给选择困难转个弯…'
              : '正在打包你的惊喜…'
            : kind === '转盘'
              ? '今天的随心转盘'
              : '今天的口味盲盒'}
        </h2>
        <p>
          不花积分，不自动下单。
          <br />
          只是遇见一份，没想到的喜欢。
        </p>
      </div>
      <div className="lab-controls">
        <label>今天的心情</label>
        <div className="chips wrap">
          {['随心一点', '经典老友', '尝鲜出发', '来点甜的'].map((s) => (
            <button
              className={`chip ${mood === s ? 'selected' : ''}`}
              aria-pressed={mood === s}
              key={s}
              onClick={() => setMood(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="line-between">
          <label htmlFor="budget">菜单参考预算</label>
          <strong>{money(budget * 100)}</strong>
        </div>
        <input
          id="budget"
          type="range"
          min="10"
          max="100"
          step="5"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
        <div className="lab-form-grid">
          <label>
            想遇见几份
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value="1">一份小快乐</option>
              <option value="2">两份小惊喜</option>
              <option value="3">三份新灵感</option>
            </select>
          </label>
          <label>
            跳过名称关键词
            <input
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="例如：咖啡、辣"
            />
          </label>
        </div>
        <p className="micro muted">
          关键词仅匹配餐品名称，无法判断配料和过敏原；套餐及特调最终金额需重新核价。
        </p>
        <div className="button-row">
          <button
            className="button primary grow"
            disabled={spinning || a.menu.loading}
            onClick={() => generate()}
          >
            <PackageOpen size={19} />
            打开口味盲盒
          </button>
          <button
            className="button secondary"
            disabled={spinning || a.menu.loading}
            onClick={() => generate(true)}
          >
            <Shuffle size={18} />
            转盘选一份
          </button>
        </div>
      </div>
      {picks.length > 0 && (
        <section className="reveal-area" aria-live="polite">
          <SectionTitle
            title={kind === '盲盒' ? '叮，你的惊喜到了！' : '转盘停在了这里'}
            caption={`菜单参考 ${money(picks.reduce((n, m) => n + (m.price ?? 0), 0))}`}
          />
          <div className="meal-grid">
            {picks.map((m) => (
              <MealCard key={m.code} meal={m} onClick={() => openMeal(m)} />
            ))}
          </div>
          <p className="hint">喜欢哪份，就点开选配。盲盒不会自动加入餐袋。</p>
        </section>
      )}
      <section className="lab-footnote">
        <Compass size={25} />
        <div>
          <h3>冒险的终点，是你的喜欢。</h3>
          <p>尝过之后，去「护照」盖一枚自己的印章。每个小发现都值得被记住。</p>
        </div>
      </section>
    </>
  );
}
function xml(s: string) {
  return s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}
export async function exportCard(title: string, lines: string[], footer: string) {
  const content = lines
    .slice(0, 7)
    .map(
      (s, i) =>
        `<text x="64" y="${300 + i * 54}" font-size="24" fill="#1d1d1f">${xml(s.slice(0, 28))}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="900"><rect width="750" height="900" rx="36" fill="#f5f5f7"/><rect x="32" y="32" width="686" height="836" rx="22" fill="none" stroke="#e1ddcf" stroke-width="2"/><text x="64" y="110" font-size="22" fill="#b64413" font-family="sans-serif">McJOURNEY / 麦游记</text><text x="64" y="196" font-size="42" font-weight="bold" fill="#1d1d1f" font-family="sans-serif">${xml(title.slice(0, 14))}</text><path d="M64 236h622" stroke="#c9c6b8" stroke-dasharray="6 8"/>${content}<circle cx="598" cy="735" r="60" fill="none" stroke="#b64413" stroke-width="3"/><text x="598" y="730" text-anchor="middle" font-size="18" fill="#b64413">A LITTLE</text><text x="598" y="760" text-anchor="middle" font-size="24" fill="#b64413">JOY</text><text x="64" y="804" font-size="17" fill="#636369">${xml(footer.slice(0, 52))}</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('卡片生成失败'));
      image.src = url;
    });
    const c = document.createElement('canvas');
    c.width = 750;
    c.height = 900;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持卡片导出');
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('图片导出失败'))), 'image/png'),
    );
    const out = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = out;
    link.download = 'maiyouji-card.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(out), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function Passport({ openMeal }: { openMeal: (m: Meal) => void }) {
  const a = useApp();
  const mode = a.session!.mode;
  const stamps = a.stamps.filter((s) => s.mode === mode);
  const recipes = a.recipes.filter((s) => s.mode === mode);
  const [record, setRecord] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(5);
  const [section, setSection] = useState('印章');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [capsules, setCapsules] = useCapsules();
  const [capsuleForm, setCapsuleForm] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cNote, setCNote] = useState('');
  const [cDate, setCDate] = useState('');
  function addStamp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    a.setStamps((s) =>
      [
        {
          id: crypto.randomUUID(),
          name: name.trim().slice(0, 60),
          note: note.slice(0, 300),
          rating,
          date: new Date().toISOString(),
          mode,
        },
        ...s,
      ].slice(0, 500),
    );
    setRecord(false);
    setName('');
    setNote('');
    a.toast('新的喜欢，盖章留念！');
  }
  async function rebuild(r: Recipe) {
    if (
      !a.context ||
      a.context.storeCode !== r.storeCode ||
      (r.beType && a.context.beType !== r.beType)
    ) {
      a.toast('请先切换到保存时的门店与取餐方式，再按当前菜单重建');
      return;
    }
    await a.run(async () => {
      const missing = r.codes.filter((code) => !a.meals.some((m) => m.code === code));
      if (missing.length) throw new Error(`${missing.length} 款餐品已不在当前菜单，请重新挑选`);
      const lines = [];
      for (const [index, code] of r.codes.entries()) {
        const quantity = r.quantities?.[index] ?? 1;
        const meal = a.meals.find((m) => m.code === code)!;
        const d = (await tool('query-meal-detail', { ...contextArgs(a.context!), code })).result;
        lines.push({
          id: crypto.randomUUID(),
          meal,
          quantity,
          item: { ...buildMealItem(d, {}, {}), quantity },
          description: '从收藏餐单重建 · 当前默认搭配',
        });
      }
      a.setCart(lines);
      setRecipe(null);
      a.setTab('menu');
      a.toast('已按当前默认搭配重建餐袋，请重新核价');
    });
  }
  const badges = [
    { icon: '✳', name: '第一口新鲜', done: stamps.length >= 1 },
    { icon: '✦', name: '风味探索家', done: new Set(stamps.map((s) => s.name)).size >= 3 },
    { icon: '❋', name: '日常收藏家', done: recipes.length >= 3 },
    { icon: '✹', name: '快乐记事员', done: stamps.length >= 7 },
  ];
  return (
    <>
      <PageTitle
        eyebrow="MY TASTE PASSPORT"
        title="味觉护照"
        description="你的餐单、印章和味觉回忆。"
        action={
          <button className="icon-button" aria-label="护照设置" onClick={() => a.setSettings(true)}>
            <BookOpen size={23} />
          </button>
        }
      />
      <section className="passport-cover">
        <div className="passport-meta">
          <span>我的味觉记录</span>
          <span>保存在此设备</span>
        </div>
        <div className="passport-emblem">
          <Compass size={55} strokeWidth={1.2} />
        </div>
        <h2>每一口，都算数。</h2>
        <span>从一次尝鲜，慢慢认识自己的喜欢。</span>
        <div className="passport-stats">
          <div>
            <strong>{stamps.length}</strong>
            <small>枚尝鲜印章</small>
          </div>
          <div>
            <strong>{recipes.length}</strong>
            <small>份收藏餐单</small>
          </div>
          <div>
            <strong>{badges.filter((b) => b.done).length}</strong>
            <small>枚探索徽章</small>
          </div>
        </div>
      </section>
      <div className="chips wrap passport-tabs">
        {['印章', '餐单', '徽章', '时光胶囊', '收藏'].map((s) => (
          <button
            key={s}
            className={`chip ${section === s ? 'selected' : ''}`}
            aria-pressed={section === s}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {section === '印章' && (
        <>
          <SectionTitle
            title="味蕾来过的地方"
            caption="记一口喜欢"
            onClick={() => setRecord(true)}
          />
          {stamps.length ? (
            <div className="stamp-grid">
              {stamps.map((s, i) => (
                <article className={`stamp-card stamp-${i % 3}`} key={s.id}>
                  <div className="stamp-top">
                    <span>尝过，喜欢</span>
                    <button
                      aria-label={`删除${s.name}印章`}
                      className="icon-button"
                      onClick={() => a.setStamps((x) => x.filter((v) => v.id !== s.id))}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="stamp-mark">
                    <Compass size={24} />
                  </div>
                  <h3>{s.name}</h3>
                  <span className="stars">
                    {'★'.repeat(s.rating)}
                    {'☆'.repeat(5 - s.rating)}
                  </span>
                  {s.note && <p>{s.note}</p>}
                  <small>{new Date(s.date).toLocaleDateString('zh-CN')}</small>
                  <button
                    className="text-button"
                    onClick={() =>
                      void a.run(() =>
                        exportCard(
                          '我的味觉印章',
                          [s.name, '★'.repeat(s.rating), s.note],
                          `个人记录 · ${new Date(s.date).toLocaleDateString('zh-CN')}`,
                        ),
                      )
                    }
                  >
                    <Download size={13} />
                    分享卡片
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="第一枚印章，等你来盖"
              text="记录你亲自尝过的餐品和心情，这是属于你的日常小记。"
              action={
                <button className="button primary" onClick={() => setRecord(true)}>
                  <Plus size={16} />
                  记一口喜欢
                </button>
              }
            />
          )}
          <p className="micro muted">印章是个人手动记录，不代表官方消费或完成任务的凭证。</p>
        </>
      )}
      {section === '餐单' && (
        <>
          <SectionTitle title="下次，还想吃这些" />
          {recipes.length ? (
            <div className="stack">
              {recipes.map((r) => (
                <button key={r.id} className="recipe-card" onClick={() => setRecipe(r)}>
                  <span className="recipe-number">
                    <BookOpen size={24} />
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <p>
                      {r.codes.length} 份餐品 · {r.date.slice(0, 10)}
                    </p>
                  </div>
                  <ArrowUpRight size={20} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="还没有收藏餐单"
              text="在餐袋里给喜欢的组合起个名字，就能收藏到这里。"
              action={
                <button className="button secondary" onClick={() => a.setTab('menu')}>
                  去挑餐品
                </button>
              }
            />
          )}
        </>
      )}
      {section === '徽章' && (
        <>
          <SectionTitle title="一点点探索，一点点成长" />
          <div className="badge-grid">
            {badges.map((b) => (
              <div className={`badge-card ${b.done ? 'earned' : ''}`} key={b.name}>
                <span>{b.icon}</span>
                <strong>{b.name}</strong>
                <small>{b.done ? '已点亮' : '等待下一段小冒险'}</small>
              </div>
            ))}
          </div>
          <p className="micro muted">徽章由本机个人记录解锁，不关联官方权益。</p>
        </>
      )}
      {section === '时光胶囊' && (
        <>
          <SectionTitle
            title="写给未来的下一餐"
            caption="装一颗胶囊"
            onClick={() => setCapsuleForm(true)}
          />
          {capsules.filter((c) => c.mode === mode).length ? (
            capsules
              .filter((c) => c.mode === mode)
              .map((c) => (
                <article className="capsule-card" key={c.id}>
                  <Clock3 size={25} />
                  <div>
                    <h3>{c.title}</h3>
                    <p>
                      {new Date(c.date + 'T00:00:00').getTime() <= Date.now()
                        ? c.note
                        : `封存中 · ${c.date} 打开`}
                    </p>
                    <small>本机趣味记录</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="删除胶囊"
                    onClick={() => setCapsules((s) => s.filter((v) => v.id !== c.id))}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))
          ) : (
            <Empty
              title="把今天的心情，留给下一餐"
              text="给未来的自己写一句话，到约定的那天再打开。"
              action={
                <button className="button primary" onClick={() => setCapsuleForm(true)}>
                  装一颗时光胶囊
                </button>
              }
            />
          )}
          <p className="micro muted">胶囊保存在本机，仅作趣味展示，不提供加密或防提前查看能力。</p>
        </>
      )}
      {section === '收藏' && (
        <div className="meal-grid">
          {a.meals
            .filter((m) => a.favorites.includes(`${mode}:${m.code}`))
            .map((m) => (
              <MealCard key={m.code} meal={m} onClick={() => openMeal(m)} />
            ))}
          {!a.meals.some((m) => a.favorites.includes(`${mode}:${m.code}`)) && (
            <Empty title="收藏夹还空着" text="点餐品卡片上的爱心，把喜欢收起来。" />
          )}
        </div>
      )}
      {record && (
        <Sheet title="盖一枚新印章" onClose={() => setRecord(false)}>
          <form className="stack" onSubmit={addStamp}>
            <label>
              这次尝了什么
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                list="meal-names"
                placeholder="餐品名称"
                maxLength={60}
              />
              <datalist id="meal-names">
                {a.meals.map((m) => (
                  <option key={m.code} value={m.name} />
                ))}
              </datalist>
            </label>
            <label>喜欢程度</label>
            <div className="rating-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" aria-label={`${n}星`} key={n} onClick={() => setRating(n)}>
                  <Star size={31} fill={n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label>
              想记住的一句话
              <textarea
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="今天的快乐是什么味道？"
              />
            </label>
            <button className="button primary full">盖章，留住这口喜欢</button>
          </form>
        </Sheet>
      )}
      {recipe && (
        <Sheet title={recipe.name} onClose={() => setRecipe(null)}>
          <p className="muted small">
            门店编号 {recipe.storeCode} · 保存于 {recipe.date.slice(0, 10)}
          </p>
          {recipe.codes.map((code, i) => (
            <p key={i} className="recipe-row">
              {a.meals.find((m) => m.code === code)?.name ?? `餐品 ${code}（请切换原门店查看）`} ×{' '}
              {recipe.quantities?.[i] ?? 1}
            </p>
          ))}
          <p className="hint">
            重建会替换当前餐袋，并重新读取餐品默认搭配；原优惠券、特调及旧价格不沿用。
          </p>
          <div className="stack">
            <button
              className="button primary full"
              onClick={() => void rebuild(recipe)}
              disabled={a.busy}
            >
              按当前菜单重建
            </button>
            <button
              className="button secondary"
              onClick={() =>
                void a.run(() =>
                  exportCard(
                    recipe.name,
                    recipe.codes.map((c) => a.meals.find((m) => m.code === c)?.name ?? `餐品 ${c}`),
                    '收藏餐单 · 无价格承诺 · 麦游记',
                  ),
                )
              }
            >
              <Download size={17} />
              导出餐单卡片
            </button>
            <button
              className="text-button danger"
              onClick={() => {
                a.setRecipes((s) => s.filter((r) => r.id !== recipe.id));
                setRecipe(null);
              }}
            >
              删除这份餐单
            </button>
          </div>
        </Sheet>
      )}
      {capsuleForm && (
        <Sheet title="给下一餐的一句话" onClose={() => setCapsuleForm(false)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              setCapsules((s) => [
                { id: crypto.randomUUID(), title: cTitle, note: cNote, date: cDate, mode },
                ...s,
              ]);
              setCapsuleForm(false);
              setCTitle('');
              setCNote('');
              setCDate('');
              a.toast('时光胶囊已装好');
            }}
          >
            <label>
              胶囊的名字
              <input
                required
                maxLength={40}
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                placeholder="给周五晚上的自己"
              />
            </label>
            <label>
              这天打开
              <input
                required
                type="date"
                value={cDate}
                onChange={(e) => setCDate(e.target.value)}
              />
            </label>
            <label>
              想说的话
              <textarea
                required
                value={cNote}
                maxLength={500}
                onChange={(e) => setCNote(e.target.value)}
              />
            </label>
            <button className="button primary full">封存这份期待</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
import { useLocal } from './state';
type Capsule = { id: string; title: string; note: string; date: string; mode: string };
function useCapsules() {
  return useLocal<Capsule[]>('maiyouji-capsules-v1', []);
}
