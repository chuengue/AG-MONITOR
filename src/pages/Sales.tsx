import type { Executive, MonitorLists } from '../api';
import { date, money, PRODUCTION_STATUS } from '../format';
import type { DetailRef } from './DetailSheet';
import { Empty, Row, Section } from './ui';

export function Sales({ data, lists, onOpen }: { data: Executive; lists: MonitorLists; onOpen: (t: DetailRef) => void }) {
  const sellers = data.sellers.filter((s) => s.orders > 0 || s.quotationsIssued > 0);
  const max = Math.max(1, ...sellers.map((s) => Number(s.amount)));
  return (
    <>
      <Section title="Por vendedor">
        {sellers.length ? (
          sellers.map((s) => (
            <div key={s.seller.id} className="rank">
              <div className="rank-head">
                <span className="row-title">{s.seller.name}</span>
                <span className="row-value">{money(s.amount)}</span>
              </div>
              <div className="rank-bar">
                <div style={{ width: `${(Number(s.amount) / max) * 100}%` }} />
              </div>
              <div className="row-sub">
                {s.orders} pedidos · {s.quotationsIssued} cotações
                {s.conversionRate !== null && ` · ${Number(s.conversionRate).toLocaleString('pt-BR')}% convertidas`}
              </div>
            </div>
          ))
        ) : (
          <Empty text="Nenhuma venda no período." />
        )}
      </Section>

      {data.clients.length > 0 && (
        <Section title="Maiores clientes">
          {data.clients.slice(0, 5).map((c) => (
            <Row
              key={c.client.id}
              title={c.client.name}
              subtitle={`${c.orders} pedidos`}
              value={money(c.amount)}
              meta={c.share === null ? undefined : `${Number(c.share).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% do total`}
            />
          ))}
        </Section>
      )}

      <Section title="Pedidos do período" aside={lists.sales.length >= 100 ? 'últimos 100' : `${lists.sales.length}`}>
        {lists.sales.length ? (
          lists.sales.map((s) => (
            <Row
              key={s.id}
              onClick={() => onOpen({ kind: 'sale', id: s.id })}
              title={`${s.number} · ${s.client}`}
              subtitle={`${date(s.date)} · ${s.seller}`}
              value={money(s.amount)}
              clip={s.attachments > 0}
              meta={s.productionStatus ? PRODUCTION_STATUS[s.productionStatus] : 'Não enviado à produção'}
            />
          ))
        ) : (
          <Empty text="Nenhum pedido no período." />
        )}
      </Section>
    </>
  );
}
