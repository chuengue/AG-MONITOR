// Display helpers. The API returns decimal strings; nothing is calculated here
// except the variation between two periods.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlShort = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const money = (v: string | number | null | undefined) => (v === null || v === undefined ? '—' : brl.format(Number(v)));
export const moneyShort = (v: string | number) => brlShort.format(Number(v));

export const kg = (v: string | null | undefined) =>
  v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;

/** "2026-11-06" is a calendar day: formatted from its parts (no UTC shift). */
export const date = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

/** % change from previous to current; null when there is no base. */
export function change(current: string | number, previous: string | number): number | null {
  const c = Number(current);
  const p = Number(previous);
  if (!p) return null;
  return ((c - p) / p) * 100;
}

export const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

export const QUOTE_STATUS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviada',
  em_negociacao: 'Negociação',
  aprovado: 'Aprovada',
};

export const PRODUCTION_STATUS: Record<string, string> = {
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
};
