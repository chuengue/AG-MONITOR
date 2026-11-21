// Copia o gerador do PDF da proposta do app desktop (AG-ELECTRON) para cá,
// sem a parte do Electron, para o PDF do celular sair igual ao do ERP.
//   npm run sync:proposta     (rode depois de mudar o PDF no AG-ELECTRON)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electron = join(root, '..', 'AG-ELECTRON', 'src');
const src = readFileSync(join(electron, 'main', 'proposal.ts'), 'utf8');
const units = readFileSync(join(electron, 'shared', 'units.ts'), 'utf8');

const start = src.indexOf('export type ProposalData');
const end = src.indexOf('/** Fetches the proposal');
if (start < 0 || end < 0) throw new Error('proposal.ts mudou de formato: ajuste scripts/sync-proposal.mjs');

const header = `// GERADO por scripts/sync-proposal.mjs a partir de AG-ELECTRON/src/main/proposal.ts
// e src/shared/units.ts. Não edite aqui: mude lá e rode \`npm run sync:proposta\`.
/* eslint-disable */
`;
writeFileSync(join(root, 'src', 'vendor', 'units.ts'), header + units);
writeFileSync(
  join(root, 'src', 'vendor', 'proposal.ts'),
  header + "import { UNIT_NAMES, unitName } from './units';\n\n" + src.slice(start, end).trimEnd() + '\n',
);
console.log('Gerador da proposta copiado para src/vendor/.');
