import { useState } from 'react';
import type { Executive, MonitorLists } from '../api';
import { date, money, PRODUCTION_STATUS } from '../format';
import type { DetailRef } from './DetailSheet';
import { Empty, Row, Section } from './ui';

type Filter = 'todos' | 'atrasados' | 'em_producao' | 'pronto';

export function Orders({ data, lists, onOpen }: { data: Executive; lists: MonitorLists; onOpen: (t: DetailRef) => void }) {
  const [filter, setFilter] = useState<Filter>('todos');
  const all = lists.production;
  const count = (f: Filter) =>
    f === 'todos' ? all.length : f === 'atrasados' ? all.filter((o) => o.late).length : all.filter((o) => o.status === f).length;
  const shown = all.filter((o) =>
    filter === 'todos' ? true : filter === 'atrasados' ? o.late : o.status === filter,
  );
  const chips: { key: Filter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'atrasados', label: 'Atrasados' },
    { key: 'em_producao', label: 'Em produção' },
    { key: 'pronto', label: 'Prontos' },
  ];

  return (
    <>
      <div className="chips">
        {chips.map((c) => (
          <button key={c.key} className={`chip ${filter === c.key ? 'on' : ''} ${c.key === 'atrasados' && count(c.key) ? 'warn' : ''}`} onClick={() => setFilter(c.key)}>
            {c.label} <b>{count(c.key)}</b>
          </button>
        ))}
      </div>
      <Section
        title="Na produção"
        aside={`${data.production.dueThisWeek} vencem em 7 dias · ${data.production.delivered} entregues no período`}
      >
        {shown.length ? (
          shown.map((o) => (
            <Row
              key={o.id}
              onClick={() => onOpen({ kind: 'sale', id: o.id })}
              title={`${o.number} · ${o.client}`}
              subtitle={`${o.seller} · entrega ${date(o.deliveryDate)}`}
              value={money(o.amount)}
              badge={
                o.late
                  ? { text: 'Atrasado', tone: 'danger' }
                  : { text: PRODUCTION_STATUS[o.status] ?? o.status, tone: o.status === 'pronto' ? 'ok' : 'info' }
              }
            />
          ))
        ) : (
          <Empty text="Nenhum pedido aqui." />
        )}
      </Section>
    </>
  );
}
