import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { session, tool, prepare, commit, unlock, type Session, type ToolResponse } from './api';
import {
  normalizeMenu,
  contextArgs,
  type Bag,
  type Context,
  type CartLine,
  type Meal,
} from '../shared/domain';
export type Tab = 'discover' | 'menu' | 'inspire' | 'wallet' | 'passport';
export type Stamp = {
  id: string;
  name: string;
  date: string;
  note: string;
  rating: number;
  mode: string;
};
export type Recipe = {
  id: string;
  name: string;
  codes: string[];
  quantities?: number[];
  beType?: number;
  storeCode: string;
  mode: string;
  date: string;
};
function read<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    const value = s ? JSON.parse(s) : fallback;
    return Array.isArray(fallback) && !Array.isArray(value) ? fallback : value;
  } catch {
    return fallback;
  }
}
export function useLocal<T>(key: string, initial: T) {
  const [value, set] = useState<T>(() => read(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* The app remains usable in private browsing. */
    }
  }, [key, value]);
  useEffect(() => {
    const reset = () => set(initial);
    window.addEventListener('maiyouji-reset', reset);
    return () => window.removeEventListener('maiyouji-reset', reset);
  }, [key]);
  return [value, set] as const;
}
export function useResource(name: string, args: Bag = {}, enabled = true, revision = 0) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Bag | null>(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify(args);
  useEffect(() => {
    setData(null);
    setMeta(null);
    setError('');
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    tool(name, JSON.parse(key), controller.signal)
      .then((r) => {
        if (active) {
          setData(r.result);
          setMeta(r.meta);
        }
      })
      .catch((e) => {
        if (active && e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [name, key, enabled, revision, retry]);
  return { data, error, loading, meta, reload: () => setRetry((x) => x + 1) };
}
export type AppState = {
  session: Session | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  context: Context | null;
  selectContext: (c: Context) => void;
  clearContext: () => void;
  meals: Meal[];
  menu: ReturnType<typeof useResource>;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  addLine: (line: Omit<CartLine, 'id'>) => void;
  revision: number;
  refresh: () => void;
  toast: (s: string) => void;
  notice: string;
  busy: boolean;
  run: <T>(p: () => Promise<T>, cb?: (v: T) => void) => Promise<T | undefined>;
  action: (name: string, args: Bag, done?: (result: Bag) => void) => Promise<void>;
  confirmation: Bag | null;
  setConfirmation: (x: Bag | null) => void;
  confirm: () => void;
  result: Bag | null;
  setResult: (x: Bag | null) => void;
  settings: boolean;
  setSettings: (v: boolean) => void;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  stamps: Stamp[];
  setStamps: React.Dispatch<React.SetStateAction<Stamp[]>>;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  bootError: string;
  retryBoot: () => void;
  unlockApp: (key: string) => Promise<void>;
};
const C = createContext<AppState | null>(null);
export const useApp = () => useContext(C)!;
export function Provider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<Session | null>(null);
  const [bootError, setBootError] = useState('');
  const [boot, setBoot] = useState(0);
  const [tab, setTab] = useState<Tab>('discover');
  const [context, setContext] = useState<Context | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [revision, revise] = useState(0);
  const [notice, setNotice] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(0);
  const [confirmation, setConfirmation] = useState<Bag | null>(null);
  const [result, setResult] = useState<Bag | null>(null);
  const [settings, setSettings] = useState(false);
  const doneRef = useRef<((r: Bag) => void) | undefined>(undefined);
  const executing = useRef(false);
  const [recipes, setRecipes] = useLocal<Recipe[]>('maiyouji-recipes-v1', []);
  const [stamps, setStamps] = useLocal<Stamp[]>('maiyouji-stamps-v1', []);
  const [favorites, setFavorites] = useLocal<string[]>('maiyouji-favorites-v1', []);
  useEffect(() => {
    let active = true;
    setBootError('');
    session()
      .then((s) => {
        if (!active) return;
        setInfo(s);
        if (s.mode === 'demo')
          setContext({
            storeCode: s.snapshot.storeCode,
            storeName: '上海华旭国际大厦餐厅 · 示例',
            beType: 1,
            orderType: 1,
          });
      })
      .catch((e) => {
        if (active) setBootError(e.message);
      });
    return () => {
      active = false;
    };
  }, [boot]);
  const menu = useResource(
    'query-meals',
    context ? contextArgs(context) : {},
    !!info && !info.locked && !!context,
    revision,
  );
  const meals = normalizeMenu(menu.data ?? {});
  const toast = useCallback((s: string) => {
    setNotice(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 4000);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const run = useCallback(
    async <T,>(p: () => Promise<T>, cb?: (v: T) => void) => {
      setPending((x) => x + 1);
      try {
        const v = await p();
        cb?.(v);
        return v;
      } catch (e) {
        toast(e instanceof Error ? e.message : '操作未完成');
        return undefined;
      } finally {
        setPending((x) => x - 1);
      }
    },
    [toast],
  );
  async function action(name: string, args: Bag, done?: (r: Bag) => void) {
    await run(
      () => prepare(name, args),
      (r) => {
        doneRef.current = done;
        setConfirmation(r);
      },
    );
  }
  const confirm = () => {
    if (!confirmation || executing.current) return;
    executing.current = true;
    const id = confirmation.id;
    void run(
      () => commit(id),
      (r) => {
        setResult({ title: confirmation.preview.title, result: r.result, meta: r.meta });
        doneRef.current?.(r.result);
        revise((x) => x + 1);
      },
    ).finally(() => {
      setConfirmation(null);
      doneRef.current = undefined;
      executing.current = false;
    });
  };
  function selectContext(c: Context) {
    setContext(c);
    setCart([]);
    setTab('menu');
    toast('已切换门店，餐袋已清空');
  }
  function addLine(line: Omit<CartLine, 'id'>) {
    setCart((c) => [...c, { ...line, id: crypto.randomUUID() }]);
    toast('已装进餐袋');
  }
  return (
    <C.Provider
      value={{
        session: info,
        bootError,
        retryBoot: () => setBoot((x) => x + 1),
        unlockApp: async (key) => {
          await unlock(key);
          setInfo((s) => (s ? { ...s, locked: false } : s));
        },
        tab,
        setTab,
        context,
        selectContext,
        clearContext: () => {
          setContext(null);
          setCart([]);
        },
        meals,
        menu,
        cart,
        setCart,
        addLine,
        revision,
        refresh: () => revise((x) => x + 1),
        toast,
        notice,
        busy: pending > 0,
        run,
        action,
        confirmation,
        setConfirmation,
        confirm,
        result,
        setResult,
        settings,
        setSettings,
        recipes,
        setRecipes,
        stamps,
        setStamps,
        favorites,
        setFavorites,
      }}
    >
      {children}
    </C.Provider>
  );
}
