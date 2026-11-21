// GERADO por scripts/sync-proposal.mjs a partir de AG-ELECTRON/src/main/proposal.ts
// e src/shared/units.ts. Não edite aqui: mude lá e rode `npm run sync:proposta`.
/* eslint-disable */
// Unit names shown to people (screens and PDFs): always the full name, in
// capitals and singular ("350 QUILO", "10 PEÇA"). Prices keep the short form
// (R$/kg, R$/pç) and so do the compact pç | kg toggles of the quotation grid.

export const UNIT_NAMES: Record<string, string> = {
  KG: 'QUILO',
  UN: 'UNIDADE',
  M: 'METRO',
  M2: 'METRO QUADRADO',
  CH: 'CHAPA',
  BR: 'BARRA',
  PC: 'PEÇA',
};

/**
 * Full name of a unit code. `piece`: UN of a material with weight (or any
 * stock / production piece) is a PEÇA, not a generic UNIDADE. The legacy
 * "pç" sent by older APIs is a piece too.
 */
export function unitName(
  unit: string | null | undefined,
  opts: { piece?: boolean } = {},
): string {
  if (!unit) return '';
  if (unit === 'pç' || (unit === 'UN' && opts.piece)) return UNIT_NAMES.PC;
  return UNIT_NAMES[unit] ?? unit;
}
