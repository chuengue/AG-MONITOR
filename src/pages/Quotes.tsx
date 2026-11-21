import { useState } from 'react';
import type { Executive, MonitorLists } from '../api';
import { date, money, QUOTE_STATUS } from '../format';
import { Empty, Row, Section } from './ui';

type Sort = 'recentes' | 'valor' | 'paradas';

export function Quotes({ data, lists }: { data: Executive; lists: MonitorLists }) {
  const [sort, setSort] = useState<Sort>('recentes');
  const quotes = [...lists.openQuotes].sort((a, b) =>
    sort === 'valor' ? Number(b.amount) - Number(a.amount) : sort === 'paradas' ? (b.daysOpen ?? 0) - (a.daysOpen ?? 0) : 0,
  );
  const { count, amount } = data.revenue.openQuotations;

  return (
    <>
      <div className="hero compact">
        <span className="kpi-label">Em aberto (não vencidas)</span>
        <span className="hero-value">{money(amount)}</span>
        <span className="muted small">{count} cotações · não depende do período</span>
      </div>
      <div className="chips">
        {(
          [
            ['recentes', 'Recentes'],
            ['valor', 'Maior valor'],
            ['paradas', 'Mais paradas'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>
            {label}
          </button>
        ))}
      </div>
      <Section title="Cotações" aside={quotes.length < count ? `${quotes.length} mais recentes` : undefined}>
        {quotes.length ? (
          quotes.map((q) => {
            const days = q.daysOpen ?? 0;
            return (
              <Row
                key={q.id}
                title={`${q.number} · ${q.client}`}
                subtitle={`${q.seller} · ${QUOTE_STATUS[q.status] ?? q.status} · vale até ${date(q.validUntil)}`}
                value={money(q.amount)}
                badge={{
                  text: days === 0 ? 'hoje' : `${days} ${days === 1 ? 'dia' : 'dias'}`,
                  tone: days >= 15 ? 'danger' : days >= 7 ? 'neutral' : 'info',
                }}
              />
            );
          })
        ) : (
          <Empty text="Nenhuma cotação em aberto." />
        )}
      </Section>
    </>
  );
}
