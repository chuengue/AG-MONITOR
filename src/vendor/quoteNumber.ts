// GERADO por scripts/sync-proposal.mjs a partir de AG-ELECTRON/src/main/proposal.ts
// e src/shared/units.ts + quoteNumber.ts. Não edite aqui: mude lá e rode `npm run sync:proposta`.
/* eslint-disable */
/**
 * Quotation number with its revision: "ORC-0123" (original) or
 * "ORC-0123 Rev. 2" (changed twice after being sent). Used on screens, PDF
 * and file name, online and offline.
 */
export function quoteNumber(number: string, revision?: number | null): string {
  return revision && revision > 0 ? `${number} Rev. ${revision}` : number;
}
