// GERADO por scripts/sync-proposal.mjs a partir de AG-ELECTRON/src/main/proposal.ts
// e src/shared/units.ts. Não edite aqui: mude lá e rode `npm run sync:proposta`.
/* eslint-disable */
import { UNIT_NAMES, unitName } from './units';

export type ProposalData = {
  company: {
    name: string | null;
    document: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    footer: string | null;
  };
  quotation: {
    number: string;
    issueDate: string;
    validUntil: string;
    seller: string;
    /** Seller contact (absent from older API versions). */
    sellerPhone?: string | null;
    sellerEmail?: string | null;
    buyerName: string | null;
    buyerPhone: string | null;
    buyerEmail: string | null;
    paymentCondition: string | null;
    deliveryTerm: string | null;
    deliveryDate?: string | null;
    deliveryType: 'retirada' | 'entrega';
    deliveryAddress: string | null;
    notes: string | null;
    servicesInPdf: 'separados' | 'incorporados';
    /** Weight on the proposal (optional per quotation); absent = shown (older API). */
    showWeight?: boolean;
  };
  client: {
    name: string;
    personType: 'F' | 'J';
    document: string;
    address: string;
    phone: string | null;
    email: string | null;
  };
  items: {
    seq: number;
    code: string | null;
    description: string;
    pieces: number;
    saleUnit: string;
    saleQuantity: string;
    unitPrice: string | null;
    materialValue: string;
    services: {
      name: string;
      description: string | null;
      value: string;
      included?: boolean;
    }[];
    piecePrice: string | null;
    gross: string;
    discount: string;
    net: string;
    totalWeight: string | null;
    /** Custom cut part (per UN: unit shown as "pç", as any material per UN). */
    customPart?: boolean;
    /** Item without weight: the quantity is the total; only the unit is shown. */
    noWeight?: boolean;
    /** Item note, printed under the description (absent on older APIs). */
    notes?: string | null;
  }[];
  /** Columns "Quantidade" / "Unidade" (default); false = old "Peças" / "Qtd. venda". */
  quantityColumns?: boolean;
  totals: {
    materials: string;
    services: string;
    discount: string;
    itemsNet: string;
    generalDiscount: string;
    freight: string;
    extras: string;
    extrasDescription: string | null;
    total: string;
    weightKg: string | null;
  };
};

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Formatting only — every number arrives already calculated and rounded by the API.
const money = (v: string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = (v: string, max = 3) =>
  Number(v).toLocaleString('pt-BR', { maximumFractionDigits: max });
const unitPrice = (v: string) =>
  Number(v).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
const date = (iso: string) => iso.split('-').reverse().join('/');
const doc = (d: string) =>
  d.length === 14
    ? d.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5')
    : d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

export function buildProposalHtml(p: ProposalData): string {
  const incorporated = p.quotation.servicesInPdf === 'incorporados';
  const showWeight = p.quotation.showWeight !== false;
  // Empty cells under pieces, quantity, price (and weights) in detail rows.
  const gap = '<td></td>'.repeat(showWeight ? 5 : 3);
  // Weight of one piece = total weight ÷ pieces (e.g. a 6 m beam: 48,24 kg/pç).
  const pieceWeight = (i: ProposalData['items'][number]) =>
    i.totalWeight && i.pieces > 0
      ? (Number(i.totalWeight) / i.pieces).toFixed(3)
      : null;
  const kg = (v: string | null) => (v ? `${decimal(v)} kg` : '—');
  const hasDiscount = p.items.some((i) => Number(i.discount) > 0);
  // Quantidade / Unidade centred under their headers.
  const quantityColumns = p.quantityColumns !== false;
  const qc = quantityColumns ? 'm' : 'r';

  const rows = p.items
    .map((i) => {
      // Full unit names; a material with weight sold per UN is a PEÇA.
      const unit = unitName(i.saleUnit, {
        piece: i.customPart || !i.noWeight,
      });
      const qty = `${decimal(i.saleQuantity)} ${unit}`;
      // Services included in the price (all of a product's services): only
      // the names, with the item. Charged ones (avulso) keep their own rows.
      const includedNames = i.services
        .filter((s) => s.included)
        .map((s) => s.name);
      const charged = i.services.filter((s) => !s.included);
      const main = `
        <tr>
          <td class="c">${i.seq}</td>
          <td>${esc(i.code)}</td>
          <td>${esc(i.description)}${includedNames.length ? `<div class="note">Serviços: ${esc(includedNames.join(', '))}</div>` : ''}${i.notes?.trim() ? `<div class="note">Obs.: ${esc(i.notes.trim()).replace(/\n/g, '<br>')}</div>` : ''}</td>
          ${
            quantityColumns
              ? // Offline: the quantity sold and its unit apart (2.232 · KG);
                // per piece price (incorporated) counts pieces.
                `<td class="${qc}">${incorporated ? i.pieces : esc(decimal(i.saleQuantity))}</td>
          <td class="${qc}">${incorporated ? UNIT_NAMES.PC : esc(unit)}</td>`
              : `<td class="${qc}">${i.pieces}</td>
          <td class="${qc}">${i.noWeight ? esc(unit) : incorporated ? `${i.pieces} ${UNIT_NAMES.PC}` : esc(qty)}</td>`
          }
          <td class="r">${incorporated ? money(i.piecePrice!) : unitPrice(i.unitPrice!)}</td>
          ${showWeight ? `<td class="r">${kg(pieceWeight(i))}</td><td class="r">${kg(i.totalWeight)}</td>` : ''}
          ${hasDiscount ? `<td class="r">${Number(i.discount) > 0 ? money(i.discount) : '—'}</td>` : ''}
          <td class="r b">${money(incorporated ? i.net : i.materialValue)}</td>
        </tr>`;
      const services = incorporated
        ? ''
        : charged
            .map(
              (s) => `
        <tr class="svc">
          <td></td><td></td>
          <td>↳ ${esc(s.name)}${s.description ? ` — ${esc(s.description)}` : ''}</td>
          ${gap}
          ${hasDiscount ? '<td></td>' : ''}
          <td class="r">${money(s.value)}</td>
        </tr>`,
            )
            .join('');
      const discountRow =
        !incorporated && Number(i.discount) > 0
          ? `<tr class="svc"><td></td><td></td><td>↳ Desconto do item</td>${gap}${hasDiscount ? '<td></td>' : ''}<td class="r">− ${money(i.discount)}</td></tr>`
          : '';
      return main + services + discountRow;
    })
    .join('');

  const c = p.company;
  const q = p.quotation;
  const t = p.totals;
  const line = (label: string, value: string, cls = '') =>
    `<tr class="${cls}"><td>${label}</td><td class="r">${value}</td></tr>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(q.number)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #1f2937; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand img { max-height: 60px; max-width: 180px; }
  .brand h1 { margin: 0; font-size: 14pt; color: #1e3a5f; }
  .brand p, .doc p { margin: 1px 0; font-size: 8.5pt; color: #4b5563; }
  .doc { text-align: right; }
  .doc h2 { margin: 0 0 4px; font-size: 13pt; color: #1e3a5f; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
  .box h3 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .box p { margin: 1px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.items th { background: #1e3a5f; color: #fff; font-size: 8pt; text-align: left; padding: 5px 6px; }
  table.items td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.items tr.svc td { color: #4b5563; font-size: 8.5pt; border-bottom-style: dotted; }
  .r { text-align: right; white-space: nowrap; } .c { text-align: center; } .b { font-weight: 600; }
  /* Headers follow their column (table.items th would otherwise force left). */
  table.items th.r { text-align: right; } table.items th.c { text-align: center; }
  .m { text-align: center; white-space: nowrap; }
  .note { margin-top: 2px; font-size: 8.5pt; color: #4b5563; font-style: italic; }
  .bottom { display: grid; grid-template-columns: 1fr 260px; gap: 12px; page-break-inside: avoid; }
  table.totals { width: 100%; border-collapse: collapse; }
  table.totals td { padding: 3px 6px; }
  table.totals tr.grand td { border-top: 2px solid #1e3a5f; font-size: 12pt; font-weight: 700; color: #1e3a5f; padding-top: 6px; }
  footer { margin-top: 18px; font-size: 8pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px; }
</style></head>
<body>
  <header>
    <div class="brand">
      ${c.logo ? `<img src="${esc(c.logo)}" alt="">` : ''}
      <div>
        <h1>${esc(c.name ?? '')}</h1>
        ${c.document ? `<p>${esc(c.document)}</p>` : ''}
        ${c.address ? `<p>${esc(c.address)}</p>` : ''}
        <p>${[c.phone, c.email].filter(Boolean).map(esc).join(' · ')}</p>
      </div>
    </div>
    <div class="doc">
      <h2>PROPOSTA COMERCIAL</h2>
      <p><strong>Nº ${esc(q.number)}</strong></p>
      <p>Emissão: ${date(q.issueDate)}</p>
      <p>Validade: ${date(q.validUntil)}</p>
    </div>
  </header>

  <div class="grid">
    <div class="box">
      <h3>Cliente</h3>
      <p><strong>${esc(p.client.name)}</strong></p>
      ${p.client.document ? `<p>${p.client.personType === 'J' ? 'CNPJ' : 'CPF'}: ${esc(doc(p.client.document))}</p>` : ''}
      ${p.client.address ? `<p>${esc(p.client.address)}</p>` : ''}
      ${q.buyerName ? `<p>Comprador: ${esc(q.buyerName)}${q.buyerPhone ? ` · ${esc(q.buyerPhone)}` : ''}${q.buyerEmail ? ` · ${esc(q.buyerEmail)}` : ''}</p>` : ''}
    </div>
    <div class="box">
      <h3>Condições</h3>
      <p>Vendedor: ${esc(q.seller)}${q.sellerPhone ? ` · ${esc(q.sellerPhone)}` : ''}${q.sellerEmail ? ` · ${esc(q.sellerEmail)}` : ''}</p>
      <p>Pagamento: ${esc(q.paymentCondition ?? 'A combinar')}</p>
      <p>Prazo de entrega: ${esc(q.deliveryTerm ?? 'A combinar')}${q.deliveryDate ? ` (previsão ${date(q.deliveryDate)})` : ''}</p>
      <p>${q.deliveryType === 'entrega' ? `Entrega: ${esc(q.deliveryAddress)}` : 'Retirada no local'}</p>
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th class="c">Item</th><th>Código</th><th>Descrição</th><th class="${qc}">${quantityColumns ? 'Quantidade' : 'Peças'}</th>
      <th class="${qc}">${quantityColumns ? 'Unidade' : 'Qtd. venda'}</th><th class="r">${incorporated ? 'Preço/peça' : 'Preço unit.'}</th>
      ${showWeight ? '<th class="r">Peso unit.</th><th class="r">Peso total</th>' : ''}${hasDiscount ? '<th class="r">Desconto</th>' : ''}<th class="r">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="bottom">
    <div class="box">
      <h3>Observações</h3>
      <p>${q.notes ? esc(q.notes).replace(/\n/g, '<br>') : '—'}</p>
      ${showWeight && t.weightKg ? `<p style="margin-top:6px">Peso total dos materiais: <strong>${decimal(t.weightKg)} kg</strong> (peso teórico).</p>` : ''}
    </div>
    <table class="totals">
      ${
        incorporated
          ? line('Itens', money(t.itemsNet)) +
            (Number(t.generalDiscount) > 0
              ? line('Desconto', `− ${money(t.generalDiscount)}`)
              : '')
          : line('Materiais', money(t.materials)) +
            line('Serviços', money(t.services)) +
            (Number(t.discount) > 0
              ? line('Descontos', `− ${money(t.discount)}`)
              : '')
      }
      ${Number(t.freight) > 0 ? line('Frete', money(t.freight)) : ''}
      ${Number(t.extras) > 0 ? line(esc(t.extrasDescription ?? 'Acréscimos'), money(t.extras)) : ''}
      ${line('TOTAL', money(t.total), 'grand')}
    </table>
  </div>

  <footer>${c.footer ? esc(c.footer) : 'Valores sujeitos à confirmação após a validade da proposta.'}</footer>
</body></html>`;
}
