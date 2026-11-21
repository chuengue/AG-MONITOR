import type { Executive, MonitorLists } from '../api';
import { kg, money, moneyShort, monthLabel } from '../format';
import { Kpi, Section } from './ui';

type Tab = 'resumo' | 'pedidos' | 'vendas' | 'cotacoes';

export function Summary({ data, lists, onOpen }: { data: Executive; lists: MonitorLists; onOpen: (t: Tab) => void }) {
  const { current, previous, openQuotations } = data.revenue;
  const p = data.production;
  const inProduction = p.byStatus.find((s) => s.status === 'em_producao')?.count ?? 0;
  const ready = p.byStatus.find((s) => s.status === 'pronto')?.count ?? 0;
  const max = Math.max(1, ...data.monthly.map((m) => Number(m.amount)));
  const staleQuotes = lists.openQuotes.filter((q) => (q.daysOpen ?? 0) >= 7).length;

  return (
    <>
      <div className="hero">
        <span className="kpi-label">Vendido no período</span>
        <span className="hero-value">{money(current.amount)}</span>
        <HeroDelta current={current.amount} previous={previous.amount} />
        <div className="hero-meta">
          <span>{current.count} pedidos</span>
          <span>Ticket {money(current.averageTicket)}</span>
          <span>{kg(current.weight)}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Pedidos"
          value={String(current.count)}
          current={current.count}
          previous={previous.count}
          onClick={() => onOpen('vendas')}
        />
        <Kpi
          label="Margem"
          value={current.margin.percent === null ? '—' : `${Number(current.margin.percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
          hint={money(current.margin.amount)}
        />
        <Kpi
          label="Cotações em aberto"
          value={String(openQuotations.count)}
          hint={`${money(openQuotations.amount)}${staleQuotes ? ` · ${staleQuotes} paradas 7+ dias` : ''}`}
          onClick={() => onOpen('cotacoes')}
        />
        <Kpi
          label="Em produção"
          value={String(inProduction)}
          hint={`${ready} prontos para entregar`}
          onClick={() => onOpen('pedidos')}
        />
        <Kpi
          label="Atrasados"
          value={String(p.late)}
          hint={p.late ? 'Entrega vencida' : 'Nenhum atraso'}
          tone={p.late ? 'danger' : undefined}
          onClick={() => onOpen('pedidos')}
        />
        <Kpi label="Entregues" value={String(p.delivered)} current={p.delivered} previous={p.previousDelivered} />
      </div>

      <Section title="Últimos 12 meses">
        <div className="bars">
          {data.monthly.map((m, i) => (
            <div key={m.month} className="bar-col" title={`${monthLabel(m.month)}: ${money(m.amount)}`}>
              <span className="bar-val">{Number(m.amount) ? moneyShort(m.amount) : ''}</span>
              <div className={`bar ${i === data.monthly.length - 1 ? 'now' : ''}`} style={{ height: `${(Number(m.amount) / max) * 100}%` }} />
              <span className="bar-label">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function HeroDelta({ current, previous }: { current: string; previous: string }) {
  const c = Number(current);
  const p = Number(previous);
  if (!p) return <span className="hero-delta muted">Sem vendas no período anterior</span>;
  const d = ((c - p) / p) * 100;
  return (
    <span className={`hero-delta ${d >= 0 ? 'up' : 'down'}`}>
      {d >= 0 ? '▲' : '▼'} {Math.abs(d).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% · anterior {money(previous)}
    </span>
  );
}
