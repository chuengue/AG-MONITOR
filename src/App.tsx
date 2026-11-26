import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  executive,
  hasToken,
  isExecutive,
  logout,
  me,
  monitorLists,
  panelAccess,
  setOnExpired,
  type Executive,
  type MonitorLists,
  type PeriodKey,
  type User,
} from './api';
import { Conference } from './pages/Conference';
import { DetailSheet, type DetailRef } from './pages/DetailSheet';
import { Login } from './pages/Login';
import { NotificationsSheet } from './pages/NotificationsSheet';
import { Orders } from './pages/Orders';
import { Quotes } from './pages/Quotes';
import { Sales } from './pages/Sales';
import { Summary } from './pages/Summary';
import { disable as disablePush } from './push';

const REFRESH_MS = 5 * 60 * 1000;
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
];
type Tab = 'resumo' | 'pedidos' | 'vendas' | 'cotacoes' | 'conferencia';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'resumo', label: 'Resumo', icon: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z' },
  { key: 'pedidos', label: 'Pedidos', icon: 'M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4z' },
  { key: 'vendas', label: 'Vendas', icon: 'M3.5 18.5 9.5 12.5l4 4L22 6.9 20.6 5.5l-7.1 8-4-4L2 17z' },
  { key: 'cotacoes', label: 'Cotações', icon: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z' },
  { key: 'conferencia', label: 'Conferência', icon: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z' },
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
        if (panelAccess(u)) setUser(u);
        else logout();
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="splash">Carregando…</div>;
  if (!user) return <Login onLogin={setUser} />;
  const onLogout = async () => {
    // Saiu: este celular para de receber os avisos desse usuário.
    await disablePush().catch(() => {});
    logout();
    setUser(null);
  };
  // Conferente: só a tela de conferência (sem as outras abas).
  if (!isExecutive(user)) return <ConferenceOnly user={user} onLogout={onLogout} />;
  return <Panel user={user} onLogout={onLogout} />;
}

function AccountMenu({ user, onLogout, onNotifications }: { user: User; onLogout: () => void; onNotifications?: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <button className="icon-btn avatar" aria-label="Conta" onClick={() => setMenu((m) => !m)}>
        {user.name.slice(0, 1).toUpperCase()}
      </button>
      {menu && (
        <div className="menu" onClick={() => setMenu(false)}>
          <div className="menu-name">{user.name}</div>
          {onNotifications && (
            <button className="plain" onClick={onNotifications}>
              Notificações
            </button>
          )}
          <button onClick={onLogout}>Sair</button>
        </div>
      )}
    </>
  );
}

function ConferenceOnly({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="app no-tabbar">
      <header className="top">
        <div className="top-row">
          <div>
            <div className="brand">AG Painel</div>
            <div className="muted small">Conferência de pagamento</div>
          </div>
          <div className="top-actions">
            <AccountMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>
      <main className="content">
        <Conference />
      </main>
    </div>
  );
}

/** "?abrir=sale-12" (notificação tocada com o painel fechado). */
function linkTarget(): DetailRef | null {
  const m = /^(sale|quote)-(\d+)$/.exec(new URLSearchParams(location.search).get('abrir') ?? '');
  return m ? { kind: m[1] as DetailRef['kind'], id: Number(m[2]) } : null;
}

function Panel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [tab, setTab] = useState<Tab>(() => readPref('ag.painel.aba', TABS.map((t) => t.key), 'resumo'));
  const [exec, setExec] = useState<Executive | null>(null);
  const [lists, setLists] = useState<MonitorLists | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [detail, setDetail] = useState<DetailRef | null>(null);
  const [notifications, setNotifications] = useState(false);
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

  // Notificação tocada: abre o pedido/cotação. Painel fechado → ?abrir=;
  // painel aberto → mensagem do service worker.
  useEffect(() => {
    const target = linkTarget();
    if (target) {
      history.replaceState(history.state, '', location.pathname);
      openDetail(target);
    }
    const onMessage = (e: MessageEvent) => {
      const open = e.data?.type === 'ag-abrir' ? e.data.open : null;
      if (open && (open.kind === 'sale' || open.kind === 'quote') && Number.isInteger(open.id)) openDetail(open);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [openDetail]);

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
            <AccountMenu user={user} onLogout={onLogout} onNotifications={() => setNotifications(true)} />
          </div>
        </div>
        {tab !== 'conferencia' && (
        <div className="segmented" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.key} className={p.key === period ? 'on' : ''} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        )}
      </header>

      <main className="content">
        {tab === 'conferencia' ? (
          <Conference />
        ) : (
          <>
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
          </>
        )}
      </main>

      {detail && <DetailSheet target={detail} onClose={closeDetail} onOpen={openDetail} />}
      {notifications && <NotificationsSheet onClose={() => setNotifications(false)} />}

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
