import React, { useState, useEffect } from 'react';
import {
  Compass,
  UtensilsCrossed,
  Sparkles,
  WalletCards,
  BookOpen,
  Settings,
  ShoppingBag,
  ArrowUpRight,
  LoaderCircle,
  WifiOff,
  ShieldCheck,
  ArrowRight,
  Sandwich,
  Download,
  Trash2,
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';
import { useApp } from './state';
import { Discover, Inspiration, Passport, CalendarSheet } from './Explore';
import { MenuPage, StorePicker, MealDetail, CartSheet } from './Dining';
import { Wallet, LotterySheet, MallSheet, OrdersSheet, NutritionSheet } from './Wallet';
import { Sheet, DataView, PaymentLink } from './ui';
import type { Meal } from '../shared/domain';
const tabs = [
  { key: 'discover', name: '发现', Icon: Compass, en: 'Discover' },
  { key: 'menu', name: '点餐', Icon: UtensilsCrossed, en: 'Happy menu' },
  { key: 'inspire', name: '灵感', Icon: Sparkles, en: 'Taste lab' },
  { key: 'wallet', name: '钱包', Icon: WalletCards, en: 'My treasury' },
  { key: 'passport', name: '护照', Icon: BookOpen, en: 'Taste passport' },
] as const;
function App() {
  const a = useApp();
  const [stores, setStores] = useState(false);
  const [cart, setCart] = useState(false);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [calendar, setCalendar] = useState(false);
  const [lottery, setLottery] = useState(false);
  const [party, setParty] = useState(false);
  const [orders, setOrders] = useState(false);
  const [nutrition, setNutrition] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [key, setKey] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [a.tab]);
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  if (a.bootError)
    return (
      <div className="boot-screen">
        <Compass size={48} />
        <h1>暂时没连上麦游记</h1>
        <p>{a.bootError}</p>
        <button className="button primary" onClick={a.retryBoot}>
          重新连接
        </button>
      </div>
    );
  if (!a.session)
    return (
      <div className="boot-screen">
        <Compass className="spin" size={42} />
        <h1>麦游记</h1>
        <p>快乐正在路上…</p>
      </div>
    );
  if (a.session.locked)
    return (
      <div className="boot-screen">
        <LockKeyhole size={45} />
        <h1>打开你的麦游记</h1>
        <p>输入服务端设置的应用访问口令。</p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setUnlocking(true);
            setUnlockError('');
            void a
              .unlockApp(key)
              .catch((e) => setUnlockError(e.message))
              .finally(() => setUnlocking(false));
          }}
        >
          <input
            required
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label="应用访问口令"
            placeholder="应用访问口令"
          />
          {unlockError && <p role="alert">{unlockError}</p>}
          <button className="button primary" disabled={unlocking}>
            开启小冒险
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    );
  const cartCount = a.cart.reduce((n, l) => n + l.quantity, 0);
  const openMeal = (m: Meal) => setMeal(m);
  const nav = (desktop = false) => (
    <nav
      className={desktop ? 'desktop-nav' : 'bottom-nav'}
      aria-label={desktop ? '主导航' : '底部导航'}
    >
      {tabs.map(({ key, name, Icon }) => (
        <button
          className={a.tab === key ? 'current' : ''}
          aria-current={a.tab === key ? 'page' : undefined}
          key={key}
          onClick={() => a.setTab(key)}
        >
          <span className="nav-icon">
            <Icon size={24} strokeWidth={a.tab === key ? 2.5 : 1.8} />
          </span>
          <span>{name}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="麦游记首页">
          <span className="brand-icon">
            <Sandwich size={25} />
          </span>
          <div>
            <strong>麦游记</strong>
            <small>每一餐，小冒险</small>
          </div>
        </a>
        {nav(true)}
        <div className="sidebar-bottom">
          <button onClick={() => a.setSettings(true)}>
            <Settings size={18} />
            连接与设置
          </button>
          <span>
            Made for little everyday joys.
            <br />
            个人非官方应用
          </span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className={`toolbar-mode ${a.session.mode}`}
            onClick={() => a.setSettings(true)}
            aria-label="连接与设置"
          >
            <span className="mode-dot" />
            <span>
              <strong>{a.session.mode === 'demo' ? '演示模式' : '真实 MCP'}</strong>
              <small>
                {a.session.mode === 'demo' ? '体验数据 · 非真实交易' : '已连接麦当劳服务'}
              </small>
            </span>
            <ChevronRight size={14} />
          </button>
          <div className="topbar-actions">
            <button
              className="icon-button top-cart"
              aria-label={`打开餐袋，${cartCount}份餐品`}
              onClick={() => setCart(true)}
            >
              <ShoppingBag size={22} />
              {cartCount > 0 && <i>{cartCount}</i>}
            </button>
            <button className="avatar" aria-label="打开设置" onClick={() => a.setSettings(true)}>
              <Settings size={21} />
            </button>
          </div>
        </header>
        {offline && (
          <div className="offline-banner">
            <WifiOff size={15} />
            当前离线，账户、菜单和订单查询需要联网。
          </div>
        )}
        <main id="main-content" className={`page page-${a.tab}`}>
          {a.tab === 'discover' && (
            <Discover
              openMeal={openMeal}
              openStores={() => setStores(true)}
              openCalendar={() => setCalendar(true)}
              openLottery={() => setLottery(true)}
              openParty={() => setParty(true)}
            />
          )}
          {a.tab === 'menu' && (
            <MenuPage
              openMeal={openMeal}
              openStores={() => setStores(true)}
              openCart={() => setCart(true)}
            />
          )}
          {a.tab === 'inspire' && (
            <Inspiration openMeal={openMeal} openStores={() => setStores(true)} />
          )}
          {a.tab === 'wallet' && (
            <Wallet
              openLottery={() => setLottery(true)}
              openOrders={() => setOrders(true)}
              openParty={() => setParty(true)}
              openNutrition={() => setNutrition(true)}
            />
          )}
          {a.tab === 'passport' && <Passport openMeal={openMeal} />}
        </main>
        {nav()}
      </div>
      {stores && <StorePicker onClose={() => setStores(false)} />}{' '}
      {meal && a.context && (
        <MealDetail
          key={`${a.context.storeCode}:${meal.code}`}
          meal={meal}
          onClose={() => setMeal(null)}
        />
      )}{' '}
      {cart && <CartSheet onClose={() => setCart(false)} />}{' '}
      {calendar && <CalendarSheet onClose={() => setCalendar(false)} />}{' '}
      {lottery && <LotterySheet onClose={() => setLottery(false)} />}{' '}
      {party && <MallSheet partyOnly onClose={() => setParty(false)} />}{' '}
      {orders && <OrdersSheet onClose={() => setOrders(false)} />}{' '}
      {nutrition && <NutritionSheet onClose={() => setNutrition(false)} />}{' '}
      {a.settings && <SettingsSheet onClose={() => a.setSettings(false)} />}
      {a.confirmation && <Confirmation />}
      {a.result && (
        <Sheet title="操作结果" onClose={() => a.setResult(null)}>
          <p className="hint">
            {a.result.meta?.mode === 'demo'
              ? '这是演示结果，没有修改真实账户。'
              : '结果来自麦当劳 MCP，请核对以下信息。'}
          </p>
          <h3>{a.result.title}</h3>
          <DataView value={a.result.result} />
          <PaymentLink result={a.result.result ?? {}} />
          <p className="micro muted">
            查询时间{' '}
            {a.result.meta?.queriedAt
              ? new Date(a.result.meta.queriedAt).toLocaleString('zh-CN', {
                  timeZone: 'Asia/Shanghai',
                })
              : '—'}
          </p>
          <button
            className="button secondary full"
            onClick={() => {
              const orderId = a.result?.result?.orderId;
              a.setResult(null);
              if (orderId) setOrders(true);
            }}
          >
            {a.result.result?.orderId ? '查看我的订单与状态' : '完成，回到应用'}
          </button>
        </Sheet>
      )}
      {a.notice && (
        <div className="toast" role="status">
          {a.notice}
        </div>
      )}
      {a.busy && (
        <div className="busy-indicator" role="status">
          <LoaderCircle size={16} className="spin" />
          正在处理…
        </div>
      )}
    </div>
  );
}
function Confirmation() {
  const a = useApp();
  const c = a.confirmation!;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.ceil((c.expires - now) / 1000));
  return (
    <Sheet
      title={c.preview.title}
      onClose={() => {
        if (!a.busy) a.setConfirmation(null);
      }}
    >
      <div className="confirmation-icon">
        <ShieldCheck size={33} />
      </div>
      <div className="confirmation-lines">
        {c.preview.lines.map((line: string, i: number) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {c.preview.details?.note && (
        <section className="purchase-note">
          <h3>购买须知（原文）</h3>
          <p className="preline">{c.preview.details.note}</p>
        </section>
      )}
      <p className="hint">{c.preview.note}</p>
      <p className="micro muted">
        {seconds ? `请在 ${seconds} 秒内确认，超时需重新预览。` : '预览已过期，请关闭后重新预览。'}
      </p>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={a.busy}
          onClick={() => a.setConfirmation(null)}
        >
          再想一下
        </button>
        <button
          className="button primary grow"
          disabled={a.busy || seconds === 0}
          onClick={a.confirm}
        >
          {a.busy ? '正在提交…' : '确认执行这一次'}
        </button>
      </div>
    </Sheet>
  );
}
function SettingsSheet({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const [clear, setClear] = useState(false);
  const [install, setInstall] = useState<any>(null);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);
  function exportLocal() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: a.recipes,
      stamps: a.stamps,
      favorites: a.favorites,
      capsules: JSON.parse(localStorage.getItem('maiyouji-capsules-v1') || '[]'),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maiyouji-journal.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Sheet title="把麦游记，调成你的样子" onClose={onClose} wide>
      <div className="connection-card">
        <span className={`connection-pill ${a.session?.mode}`}>
          <i />
          {a.session?.mode === 'demo' ? '正在演示模式' : '真实 MCP 模式'}
        </span>
        <h3>
          {a.session?.mode === 'demo' ? '先体验，再连接你的麦麦世界。' : '现在使用真实麦当劳 MCP。'}
        </h3>
        <p>
          {a.session?.mode === 'demo'
            ? '菜单与部分详情使用 2026-10-29 的公开快照；积分、优惠券、活动与交易均为演示。真实模式不会在失败时悄悄改用演示数据。'
            : '账户数据直接来自麦当劳中国 MCP。Token 仅保存在服务端，不会发送到浏览器。'}
        </p>
      </div>
      <h3>连接真实 MCP</h3>
      <p className="small muted">
        在服务端项目的 .env 中设置 MCD_MCP_TOKEN 后重启应用。请从麦当劳官方开放平台申请你自己的
        Token。
      </p>
      <a
        className="button secondary full"
        href="https://open.mcd.cn/mcp"
        target="_blank"
        rel="noopener noreferrer"
      >
        打开麦当劳 MCP 开放平台
        <ArrowUpRight size={17} />
      </a>
      <h3>像 App 一样使用</h3>
      <p className="small muted">
        iPhone：Safari 分享 → 添加到主屏幕。Android：浏览器菜单 → 安装应用。安装需要 HTTPS 或本机
        localhost。
      </p>
      {install && (
        <button
          className="button primary"
          onClick={() => {
            void install.prompt();
            setInstall(null);
          }}
        >
          添加到主屏幕
        </button>
      )}
      <h3>你的记录，由你保管</h3>
      <p className="small muted">
        收藏、印章、餐单与胶囊只保存在本浏览器。订单、地址、核价与账户数据不写入本机持久存储。演示与真实的个人记录分开显示。
      </p>
      <div className="stack">
        <button
          className="button secondary full"
          onClick={() => void a.run(async () => exportLocal())}
        >
          <Download size={17} />
          导出个人手账 JSON
        </button>
        <button className="button secondary full" onClick={() => setClear(true)}>
          <Trash2 size={17} />
          清空本机记录
        </button>
      </div>
      <p className="micro muted">
        麦游记是个人非官方应用，与麦当劳不存在官方合作或背书关系。餐品图片及相关品牌内容归原权利人所有。
      </p>
      <p className="micro muted">
        v{a.session?.version} · React / TypeScript / MCP · Made for little everyday joys.
      </p>
      {clear && (
        <Sheet title="清空本机记录？" onClose={() => setClear(false)}>
          <p>
            将删除本浏览器中的收藏、印章、餐单和时光胶囊，无法撤销。你的麦当劳账户与订单不受影响。
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setClear(false)}>
              保留记录
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                a.setFavorites([]);
                a.setStamps([]);
                a.setRecipes([]);
                localStorage.removeItem('maiyouji-capsules-v1');
                window.dispatchEvent(new Event('maiyouji-reset'));
                setClear(false);
                a.toast('本机记录已清空');
              }}
            >
              确认清空
            </button>
          </div>
        </Sheet>
      )}
    </Sheet>
  );
}

export default App;
