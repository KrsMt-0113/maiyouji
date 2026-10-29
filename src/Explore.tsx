import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Compass,
  Gift,
  Ticket,
  CalendarDays,
  Sparkles,
  Shuffle,
  PackageOpen,
  Heart,
  MapPin,
  ChevronRight,
  Check,
  Download,
  Star,
  BookOpen,
  Plus,
  Trash2,
  Clock3,
  Flame,
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
export function JourneyArt() {
  return (
    <svg viewBox="0 0 300 300" fill="none" aria-hidden="true" className="journey-art">
      <circle cx="153" cy="150" r="108" fill="#f8e4aa" />
      <ellipse
        cx="157"
        cy="167"
        rx="131"
        ry="62"
        transform="rotate(-28 157 167)"
        stroke="#9b694f"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <path d="m62 221 5 14-14-5M261 98l7 13-15-1" stroke="#9b694f" strokeWidth="2" />
      <g transform="rotate(-12 148 140)" stroke="#33392e" strokeWidth="3.2" strokeLinejoin="round">
        <path d="M69 139c0-80 157-80 157 0H69Z" fill="#f2bc62" />
        <path
          d="m87 131 5-3m15-27 4 3m25-13 4 3m20 13 4-3m23 8 4 3m14 8 5-2"
          stroke="#fff4d0"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="m69 151 17 7 18-6 18 7 18-6 18 7 18-7 19 6 17-6 14 6"
          stroke="#749b65"
          strokeWidth="12"
        />
        <path d="M70 167h155v14H70z" fill="#8c5140" />
        <path d="m91 181 32 16 22-16" fill="#f5d86e" />
        <path d="M72 191h151v13c0 29-151 29-151 0v-13Z" fill="#f2bc62" />
        <path d="M117 142v9m55-9v9" strokeLinecap="round" />
        <path d="M141 154q7 7 14 0" strokeLinecap="round" />
      </g>
      <g transform="translate(208 27) rotate(13)">
        <rect width="54" height="62" rx="10" fill="#faf7ee" stroke="#33392e" strokeWidth="2.5" />
        <path d="M15 15h24M15 23h17" stroke="#adad9e" strokeWidth="3" />
        <circle cx="29" cy="43" r="10" stroke="#ed6744" strokeWidth="2" strokeDasharray="2 2" />
        <path d="m24 42 4 5 7-9" stroke="#ed6744" strokeWidth="2" />
      </g>
      <path
        d="m41 76 4 9 10 1-8 7 2 10-9-5-9 5 2-10-8-7 10-1 6-9ZM250 222l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z"
        fill="#ed6744"
      />
      <g transform="translate(38 239) rotate(-14)">
        <rect width="70" height="27" rx="6" fill="#b6ccb4" stroke="#33392e" strokeWidth="2" />
        <path d="M14 9h40m-40 8h25" stroke="#557257" strokeWidth="2" />
      </g>
      <circle cx="265" cy="158" r="6" fill="#ed6744" />
      <circle cx="89" cy="40" r="4" fill="#83a987" />
    </svg>
  );
}
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
  return (
    <>
      <div className="home-greeting">
        <div>
          <span className="eyebrow">A LITTLE JOY, EVERY DAY</span>
          <h1>生活有味，今天有麦。</h1>
        </div>
        <span className="date-pill">{date}</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span />
            每一餐，小冒险
          </span>
          <h2>
            下一站，
            <br />
            吃点开心的<span>。</span>
          </h2>
          <p>
            把熟悉的日常，
            <br />
            过成有惊喜的旅程。
          </p>
          <button className="button dark" onClick={() => a.setTab('inspire')}>
            出发找灵感
            <ArrowUpRight size={18} />
          </button>
        </div>
        <JourneyArt />
        <span className="hero-serial">McJOURNEY / VOL. 01</span>
      </section>
      <div className="quick-grid">
        {[
          {
            Icon: Compass,
            title: '挑点好吃的',
            sub: '今天的快乐菜单',
            color: 'peach',
            click: () => a.setTab('menu'),
          },
          {
            Icon: PackageOpen,
            title: '口味盲盒',
            sub: '让味蕾去旅行',
            color: 'yellow',
            click: () => a.setTab('inspire'),
          },
          {
            Icon: Ticket,
            title: '我的麦钱包',
            sub: '优惠与积分一起管',
            color: 'green',
            click: () => a.setTab('wallet'),
          },
          {
            Icon: CalendarDays,
            title: '周末去玩',
            sub: '派对与城市小聚',
            color: 'blue',
            click: openParty,
          },
        ].map(({ Icon, title, sub, color, click }) => (
          <button className="quick-item" onClick={click} key={title}>
            <span className={`quick-icon ${color}`}>
              <Icon size={23} />
            </span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>
      <SectionTitle title="今日的小冒险" caption="灵感实验室" onClick={() => a.setTab('inspire')} />
      <button className="daily-quest" onClick={() => a.setTab('inspire')}>
        <div className="quest-stamp">
          <Sparkles size={29} />
          <small>
            TRY SOMETHING
            <br />
            NEW TODAY
          </small>
        </div>
        <div>
          <span className="eyebrow">给日常一点新鲜感</span>
          <h3>下一口，试试没选过的？</h3>
          <p>放下“老样子”，开一个口味盲盒。</p>
        </div>
        <span className="round-arrow">
          <ArrowUpRight size={21} />
        </span>
      </button>
      <SectionTitle title="快乐，刚刚好" caption="打开菜单" onClick={() => a.setTab('menu')} />
      {a.context ? (
        <ResourceStatus resource={a.menu}>
          <div className="featured-grid">
            {shown.map((m) => (
              <MealCard key={m.code} meal={m} compact onClick={() => openMeal(m)} />
            ))}
          </div>
        </ResourceStatus>
      ) : (
        <button className="callout" onClick={openStores}>
          <MapPin size={25} />
          <div>
            <strong>从一家餐厅开始</strong>
            <p>选好位置，打开真实的快乐菜单。</p>
          </div>
          <ArrowRight />
        </button>
      )}
      <SectionTitle title="生活还有这些小惊喜" />
      <div className="mini-banners">
        <button className="mini-banner lavender" onClick={openLottery}>
          <Gift size={29} />
          <span>
            <strong>麦麦惊喜站</strong>
            <small>先看奖品，再决定要不要抽</small>
          </span>
          <ArrowUpRight size={19} />
        </button>
        <button className="mini-banner cream" onClick={openCalendar}>
          <CalendarDays size={29} />
          <span>
            <strong>把快乐排进日历</strong>
            <small>新活动，总值得期待一下</small>
          </span>
          <ArrowUpRight size={19} />
        </button>
      </div>
      <div className="home-footer">✳ 给平凡的一天，加一份喜欢。</div>
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
        title="让下一口，有点意外。"
        description="选择困难的时候，让一点点随机帮忙。"
      />
      <div className="lab-stage">
        <span className="lab-scribble">let your taste wander ↗</span>
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
        `<text x="64" y="${300 + i * 54}" font-size="24" fill="#394336">${xml(s.slice(0, 28))}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="900"><rect width="750" height="900" rx="36" fill="#f8f5ee"/><rect x="32" y="32" width="686" height="836" rx="22" fill="none" stroke="#e1ddcf" stroke-width="2"/><text x="64" y="110" font-size="22" fill="#ed6744" font-family="sans-serif">McJOURNEY / 麦游记</text><text x="64" y="196" font-size="42" font-weight="bold" fill="#29352b" font-family="sans-serif">${xml(title.slice(0, 14))}</text><path d="M64 236h622" stroke="#c9c6b8" stroke-dasharray="6 8"/>${content}<circle cx="598" cy="735" r="60" fill="none" stroke="#ed6744" stroke-width="3"/><text x="598" y="730" text-anchor="middle" font-size="18" fill="#ed6744">A LITTLE</text><text x="598" y="760" text-anchor="middle" font-size="24" fill="#ed6744">JOY</text><text x="64" y="804" font-size="17" fill="#6b7469">${xml(footer.slice(0, 52))}</text></svg>`;
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
        title="每一口，都有故事。"
        description="收藏喜欢，盖章留念，把快乐装进行囊。"
        action={
          <button className="icon-button" aria-label="护照设置" onClick={() => a.setSettings(true)}>
            <BookOpen size={23} />
          </button>
        }
      />
      <section className="passport-cover">
        <div className="passport-meta">
          <span>PERSONAL TASTE JOURNAL</span>
          <span>VOL. 01</span>
        </div>
        <div className="passport-emblem">
          <Compass size={55} strokeWidth={1.2} />
        </div>
        <h2>味觉护照</h2>
        <span>TASTE PASSPORT</span>
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
                    <span>TRIED & LOVED</span>
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
                    {String(recipes.indexOf(r) + 1).padStart(2, '0')}
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
