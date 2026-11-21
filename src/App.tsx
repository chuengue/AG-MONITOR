import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  executive,
  hasToken,
  logout,
  me,
  monitorLists,
  setOnExpired,
  type Executive,
  type MonitorLists,
  type PeriodKey,
  type User,
} from './api';
import { DetailSheet, type DetailRef } from './pages/DetailSheet';
import { Login } from './pages/Login';
import { Orders } from './pages/Orders';
import { Quotes } from './pages/Quotes';
import { Sales } from './pages/Sales';
import { Summary } from './pages/Summary';

const REFRESH_MS = 5 * 60 * 1000;
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
];
type Tab = 'resumo' | 'pedidos' | 'vendas' | 'cotacoes';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'resumo', label: 'Resumo', icon: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z' },
  { key: 'pedidos', label: 'Pedidos', icon: 'M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4z' },
  { key: 'vendas', label: 'Vendas', icon: 'M3.5 18.5 9.5 12.5l4 4L22 6.9 20.6 5.5l-7.1 8-4-4L2 17z' },
  { key: 'cotacoes', label: 'Cotações', icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z' },
];

const readPref = <T extends string>(k: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(k) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const writePref = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(hasToken());

  useEffect(() => {
    setOnExpired(() => setUser(null));
    if (!hasToken()) return;
    me()
      .then((u) => {
        if (u.permissions.includes('painel.executivo')) setUser(u);
        else logout();
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="splash">Carregando…</div>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Panel
      user={user}
      onLogout={() => {
        logout();
        setUser(null);
      }}
    />
  );
}

function Panel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [tab, setTab] = useState<Tab>(() => readPref('ag.painel.aba', TABS.map((t) => t.key), 'resumo'));
  const [exec, setExec] = useState<Executive | null>(null);
  const [lists, setLists] = useState<MonitorLists | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [menu, setMenu] = useState(false);
  const [detail, setDetail] = useState<DetailRef | null>(null);
  const seq = useRef(0);

  // The sheet is a history entry: the phone's back button closes it.
  const sheetOpen = useRef(false);
  useEffect(() => {
    const onPop = () => {
      sheetOpen.current = false;
      setDetail(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Quote → order inside the sheet swaps the content: still one entry.
  const openDetail = useCallback((t: DetailRef) => {
    if (!sheetOpen.current) {
      history.pushState({ sheet: true }, '');
      sheetOpen.current = true;
    }
    setDetail(t);
  }, []);
  const closeDetail = useCallback(() => {
    if (history.state?.sheet) history.back();
    else {
      sheetOpen.current = false;
      setDetail(null);
    }
  }, []);

  const load = useCallback(async (p: PeriodKey) => {
    const n = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const [e, l] = await Promise.all([executive(p), monitorLists(p)]);
      if (n !== seq.current) return;
      setExec(e);
      setLists(l);
      setUpdatedAt(new Date());
    } catch (err) {
      if (n !== seq.current) return;
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar.');
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(period);
    }, REFRESH_MS);
    // Back to the app after a while: refresh right away.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(period);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [period, load]);

  const chooseTab = (t: Tab) => {
    setTab(t);
    writePref('ag.painel.aba', t);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <header className="top">
        <div className="top-row">
          <div>
            <div className="brand">AG Painel</div>
            <div className="muted small">
              {updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' '}
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Atualizar" onClick={() => load(period)} disabled={loading}>
              <svg viewBox="0 0 24 24" className={loading ? 'spin' : ''}>
                <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
              </svg>
            </button>
            <button className="icon-btn avatar" aria-label="Conta" onClick={() => setMenu((m) => !m)}>
              {user.name.slice(0, 1).toUpperCase()}
            </button>
            {menu && (
              <div className="menu" onClick={() => setMenu(false)}>
                <div className="menu-name">{user.name}</div>
                <button onClick={onLogout}>Sair</button>
              </div>
            )}
          </div>
        </div>
        <div className="segmented" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.key} className={p.key === period ? 'on' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        {error && (
          <div className="alert">
            {error}
            <button onClick={() => load(period)}>Tentar de novo</button>
          </div>
        )}
        {!exec || !lists ? (
          !error && <div className="skeleton-list">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}</div>
        ) : (
          <>
            {tab === 'resumo' && <Summary data={exec} lists={lists} onOpen={chooseTab} onDetail={openDetail} />}
            {tab === 'pedidos' && <Orders data={exec} lists={lists} onOpen={openDetail} />}
            {tab === 'vendas' && <Sales data={exec} lists={lists} onOpen={openDetail} />}
            {tab === 'cotacoes' && <Quotes data={exec} lists={lists} onOpen={openDetail} />}
          </>
        )}
      </main>

      {detail && <DetailSheet target={detail} onClose={closeDetail} onOpen={openDetail} />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === tab ? 'on' : ''} onClick={() => chooseTab(t.key)}>
            <svg viewBox="0 0 24 24">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
