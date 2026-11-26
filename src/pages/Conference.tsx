// Conferência (2026-11-26): o conferente confere se o pedido está pago antes de
// liberar o material. Busca pelo número em destaque; sem a busca, os pedidos do
// período. Só número, vendedor, lançado por e situação do pagamento.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, conference, type ConferenceItem, type ConferencePayment, type ConferencePeriod } from '../api';
import { date } from '../format';
import { Empty, Row, Section } from './ui';

const REFRESH_MS = 5 * 60 * 1000;
const PERIODS: { key: ConferencePeriod; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
];
const PAYMENT: Record<ConferencePayment, { text: string; tone: 'danger' | 'ok' | 'neutral' }> = {
  aguardando: { text: 'Aguardando pagamento', tone: 'neutral' },
  pago: { text: 'Pago', tone: 'ok' },
  faturamento_aprovado: { text: 'Faturamento aprovado', tone: 'ok' },
  cancelado: { text: 'Cancelado', tone: 'danger' },
};

export function Conference() {
  const [period, setPeriod] = useState<ConferencePeriod>('hoje');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // busca com atraso (enquanto digita)
  const [items, setItems] = useState<ConferenceItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p: ConferencePeriod, q: string) => {
    const n = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const r = await conference(p, q);
      if (n !== seq.current) return;
      setItems(r.items);
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
    load(period, query);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(period, query);
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(period, query);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [period, query, load]);

  const searching = query !== '';

  return (
    <>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          const q = search.trim();
          if (q === query) load(period, q);
          else setQuery(q);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
        </svg>
        <input
          type="search"
          inputMode="numeric"
          enterKeyHint="search"
          placeholder="Número do pedido"
          aria-label="Buscar pelo número do pedido"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="search-clear" aria-label="Limpar busca" onClick={() => setSearch('')}>
            ×
          </button>
        )}
      </form>

      {!searching && (
        <div className="chips">
          {PERIODS.map((p) => (
            <button key={p.key} className={`chip ${period === p.key ? 'on' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="alert">
          {error}
          <button onClick={() => load(period, query)}>Tentar de novo</button>
        </div>
      )}

      {items === null ? (
        !error && (
          <div className="skeleton-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        )
      ) : (
        <Section
          title={searching ? `Busca: ${query}` : 'Pedidos'}
          aside={
            <button className="link-btn" onClick={() => load(period, query)} disabled={loading}>
              {loading
                ? 'Atualizando…'
                : updatedAt
                  ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Atualizar'}
            </button>
          }
        >
          {items.length ? (
            items.map((o) => (
              <Row
                key={o.id}
                title={o.number}
                subtitle={[`Vendedor: ${o.seller}`, o.launchedBy && `Lançado por: ${o.launchedBy}`, date(o.date)]
                  .filter(Boolean)
                  .join(' · ')}
                badge={PAYMENT[o.payment]}
              />
            ))
          ) : (
            <Empty text={searching ? 'Nenhum pedido com esse número.' : 'Nenhum pedido no período.'} />
          )}
        </Section>
      )}
    </>
  );
}
