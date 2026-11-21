// Quick view of a quotation or an order: a bottom sheet that closes with the X,
// by dragging the handle down, tapping outside or the phone's back button.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { quoteDetail, saleDetail, type DetailItem, type QuoteDetail, type SaleDetail } from '../api';
import { date, kg, money, PRODUCTION_STATUS, QUOTE_STATUS } from '../format';
import { printQuotation } from '../pdf';

export type DetailRef = { kind: 'quote' | 'sale'; id: number };

const SALE_STATUS: Record<string, string> = { confirmada: 'Ativo', rascunho: 'Rascunho', cancelada: 'Cancelado' };
const UNIT: Record<string, string> = { KG: 'kg', UN: 'un', M: 'm', M2: 'm²', CH: 'ch', BR: 'br', PC: 'pç' };

export function DetailSheet({ target, onClose, onOpen }: { target: DetailRef; onClose: () => void; onOpen: (t: DetailRef) => void }) {
  const [data, setData] = useState<QuoteDetail | SaleDetail | null>(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(0);
  const [printing, setPrinting] = useState(false);
  const start = useRef<number | null>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    (target.kind === 'quote' ? quoteDetail(target.id) : saleDetail(target.id))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Erro ao carregar.'));
    body.current?.scrollTo({ top: 0 });
    return () => {
      alive = false;
    };
  }, [target]);

  // Page behind does not scroll; Esc closes (PC).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const onDown = (e: RPointerEvent) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
  };
  const onUp = () => {
    if (drag > 110) onClose();
    else setDrag(0);
    start.current = null;
  };

  async function pdf() {
    setPrinting(true);
    try {
      await printQuotation(target.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o PDF.');
    } finally {
      setPrinting(false);
    }
  }

  const isQuote = target.kind === 'quote';
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: start.current === null ? undefined : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span />
        </div>
        <div className="sheet-head">
          <div>
            <div className="muted small">{isQuote ? 'Cotação' : 'Pedido'}</div>
            <h2>{data?.number ?? '…'}</h2>
          </div>
          <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="sheet-body" ref={body}>
          {error && <div className="alert">{error}</div>}
          {!data && !error && <div className="skeleton" />}
          {data && (isQuote ? <QuoteView q={data as QuoteDetail} onOpen={onOpen} /> : <SaleView s={data as SaleDetail} onOpen={onOpen} />)}
        </div>

        {isQuote && data && (
          <div className="sheet-foot">
            <button className="primary" onClick={pdf} disabled={printing}>
              {printing ? 'Gerando…' : 'Baixar PDF da proposta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuoteView({ q, onOpen }: { q: QuoteDetail; onOpen: (t: DetailRef) => void }) {
  return (
    <>
      <div className="sheet-summary">
        <span className="badge info">{QUOTE_STATUS[q.status] ?? statusLabel(q.status)}</span>
        <span className="sheet-total">{money(q.totals.total)}</span>
      </div>
      <Facts>
        <Fact label="Cliente" value={q.client} sub={q.clientCity} />
        <Fact label="Vendedor" value={q.seller} />
        {q.buyerName && <Fact label="Comprador" value={q.buyerName} />}
        <Fact label="Emissão" value={date(q.issueDate)} />
        <Fact label="Validade" value={date(q.validUntil)} />
        <Fact label="Pagamento" value={q.paymentCondition ?? 'A combinar'} />
        <Fact label="Entrega" value={delivery(q)} />
        {q.order && <Fact label="Pedido" value={q.order.number} onClick={() => onOpen({ kind: 'sale', id: q.order!.id })} />}
      </Facts>
      <Items items={q.items} />
      <Totals
        lines={[
          ['Materiais', q.totals.materials],
          ['Serviços', q.totals.services],
          ['Descontos', q.totals.discount, true],
          ['Frete', q.totals.freight],
          ['Acréscimos', q.totals.extras],
        ]}
        total={q.totals.total}
        weight={q.totals.weightKg}
      />
      <Notes text={q.notes} />
    </>
  );
}

function SaleView({ s, onOpen }: { s: SaleDetail; onOpen: (t: DetailRef) => void }) {
  const p = s.production;
  return (
    <>
      <div className="sheet-summary">
        {p.late ? (
          <span className="badge danger">Atrasado</span>
        ) : p.status ? (
          <span className={`badge ${p.status === 'em_producao' ? 'info' : 'ok'}`}>{PRODUCTION_STATUS[p.status]}</span>
        ) : (
          <span className="badge neutral">{SALE_STATUS[s.status] ?? s.status} · fora da produção</span>
        )}
        <span className="sheet-total">{money(s.totals.total)}</span>
      </div>
      <Facts>
        <Fact label="Cliente" value={s.client} sub={s.clientCity} />
        <Fact label="Vendedor" value={s.seller} />
        <Fact label="Data" value={date(s.date)} />
        <Fact label="Pagamento" value={s.paymentCondition ?? 'A combinar'} sub={s.paymentStatus === 'confirmado' ? 'Pagamento confirmado' : 'Pagamento pendente'} />
        <Fact label="Entrega" value={delivery(s)} />
        {s.document && <Fact label="Documento" value={s.document} />}
        {s.quotation && <Fact label="Cotação" value={s.quotation.number} onClick={() => onOpen({ kind: 'quote', id: s.quotation!.id })} />}
      </Facts>
      {p.status && (
        <div className="steps">
          <Step label="Em produção" at={p.sentAt} done />
          <Step label="Pronto" at={p.readyAt} done={Boolean(p.readyAt)} />
          <Step label="Entregue" at={p.deliveredAt} done={Boolean(p.deliveredAt)} />
        </div>
      )}
      <Items items={s.items} />
      <Totals
        lines={[
          ['Descontos', s.totals.discount, true],
          ['Frete', s.totals.freight],
          ['Acréscimos', s.totals.extras],
        ]}
        total={s.totals.total}
        weight={s.totals.weightKg}
      />
      <Notes text={s.notes} />
    </>
  );
}

const statusLabel = (s: string) => (s === 'expirado' ? 'Vencida' : s === 'rejeitado' ? 'Rejeitada' : s === 'convertido' ? 'Convertida' : s);

function delivery(d: { deliveryType: string; deliveryTerm: string | null; deliveryDate: string | null }) {
  const how = d.deliveryType === 'entrega' ? 'Entrega' : 'Retirada';
  const when = d.deliveryDate ? date(d.deliveryDate) : d.deliveryTerm;
  return when ? `${how} · ${when}` : how;
}

const Facts = ({ children }: { children: ReactNode }) => <div className="facts">{children}</div>;

function Fact({ label, value, sub, onClick }: { label: string; value: string; sub?: string | null; onClick?: () => void }) {
  return (
    <div className="fact">
      <span className="muted small">{label}</span>
      {onClick ? (
        <button className="link" onClick={onClick}>
          {value} ›
        </button>
      ) : (
        <span className="fact-value">{value}</span>
      )}
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}

function Step({ label, at, done }: { label: string; at: string | null; done: boolean }) {
  return (
    <div className={`step ${done ? 'done' : ''}`}>
      <span className="step-dot" />
      <span className="small">{label}</span>
      <span className="muted small">{at ? new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</span>
    </div>
  );
}

function Items({ items }: { items: DetailItem[] }) {
  return (
    <div className="section flat">
      <div className="section-head">
        <h2>Itens</h2>
        <span className="muted small">{items.length}</span>
      </div>
      {items.map((i) => (
        <div key={i.seq} className="item">
          <div className="item-top">
            <span className="item-desc">
              <span className="muted">{i.seq}.</span> {i.description}
            </span>
            <span className="row-value">{money(i.net)}</span>
          </div>
          <div className="row-sub">
            {Number(i.saleQuantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {UNIT[i.saleUnit] ?? i.saleUnit}
            {i.unitPrice !== null && ` × ${money(i.unitPrice)}`}
            {i.pieces > 0 && i.saleUnit !== 'UN' && i.saleUnit !== 'PC' && ` · ${i.pieces} pç`}
            {i.weightKg && ` · ${kg(i.weightKg)}`}
          </div>
          {i.services.length > 0 && (
            <div className="row-sub">
              {i.services.map((s) => (s.included ? s.name : `${s.name} ${money(s.value)}`)).join(' · ')}
            </div>
          )}
          {i.notes?.trim() && <div className="item-note">{i.notes.trim()}</div>}
        </div>
      ))}
    </div>
  );
}

function Totals({ lines, total, weight }: { lines: [string, string, boolean?][]; total: string; weight: string | null }) {
  return (
    <div className="totals">
      {lines
        .filter(([, v]) => Number(v) > 0)
        .map(([label, v, minus]) => (
          <div key={label} className="totals-line">
            <span>{label}</span>
            <span>
              {minus ? '− ' : ''}
              {money(v)}
            </span>
          </div>
        ))}
      {weight && Number(weight) > 0 && (
        <div className="totals-line muted">
          <span>Peso</span>
          <span>{kg(weight)}</span>
        </div>
      )}
      <div className="totals-line grand">
        <span>Total</span>
        <span>{money(total)}</span>
      </div>
    </div>
  );
}

const Notes = ({ text }: { text: string | null }) =>
  text?.trim() ? (
    <div className="notes">
      <div className="muted small">Observações</div>
      <p>{text.trim()}</p>
    </div>
  ) : null;
