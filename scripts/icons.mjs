// Gera src/app/design-system/icon/icons.ts com o desenho (SVG) só dos ícones que o app usa.
// Assim o app não baixa a fonte inteira do Material Symbols e o nome do ícone nunca aparece
// como texto enquanto a fonte carrega (ADR 0004).
//
// Para usar um ícone novo: ache o nome em https://fonts.google.com/icons (estilo Outlined),
// acrescente na lista abaixo e rode `npm run icons`. O arquivo gerado vai para o commit.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ICONS = [
  'add',
  'bar_chart',
  'bedtime',
  'brightness_auto',
  'cancel',
  'check',
  'check_circle',
  'close',
  'coffee',
  'dark_mode',
  'delete',
  'do_not_disturb_on',
  'domain',
  'download',
  'error',
  'fact_check',
  'group',
  'hourglass_top',
  'inbox',
  'light_mode',
  'lock',
  'lock_open',
  'more_horiz',
  'more_time',
  'pending_actions',
  'person',
  'schedule',
  'search',
  'search_off',
  'settings',
  'timer_off',
  'today',
  'visibility',
  'visibility_off',
];

const OUTPUT = new URL('../src/app/design-system/icon/icons.ts', import.meta.url);
const require = createRequire(import.meta.url);
const VIEW_BOX = '0 -960 960 960';

const entries = [...new Set(ICONS)].sort().map((name) => {
  const file = require.resolve(`@material-symbols/svg-400/outlined/${name}.svg`);
  const svg = readFileSync(file, 'utf8');
  const paths = [...svg.matchAll(/<path d="([^"]+)"\s*\/>/g)];
  if (!svg.includes(`viewBox="${VIEW_BOX}"`) || paths.length !== 1) {
    throw new Error(`${name}.svg não tem o formato esperado (um <path> e viewBox "${VIEW_BOX}").`);
  }
  return `  ${name}: '${paths[0][1]}',`;
});

const source = `// Arquivo gerado por scripts/icons.mjs. Não edite à mão: mude a lista lá e rode \`npm run icons\`.
// Desenhos do Material Symbols (estilo Outlined, peso 400), do pacote @material-symbols/svg-400.
// Licença Apache 2.0, Google: https://github.com/google/material-design-icons

/** viewBox comum a todos os ícones do Material Symbols. */
export const ICON_VIEW_BOX = '${VIEW_BOX}';

/** Atributo \`d\` do <path> de cada ícone. */
export const ICONS = {
${entries.join('\n')}
} as const;

export type IconName = keyof typeof ICONS;
`;

// Formata com a configuração do projeto, para o arquivo gerado passar no `npm run lint`.
const filepath = fileURLToPath(OUTPUT);
const options = await prettier.resolveConfig(filepath);
writeFileSync(OUTPUT, await prettier.format(source, { ...options, filepath }));
console.log(`${entries.length} ícones gravados em src/app/design-system/icon/icons.ts`);
