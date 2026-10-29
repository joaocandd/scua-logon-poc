// Confere o contraste WCAG dos pares de cor usados no produto, nos temas claro e escuro.
// Lê as cores direto de src/styles/tokens.css, então nunca fica desatualizado.
// Falha (código 1) se algum par ficar abaixo do mínimo ou se os dois blocos escuros divergirem.
// Uso: npm run contrast
import { readFileSync } from 'node:fs';

const TOKENS_FILE = new URL('../src/styles/tokens.css', import.meta.url);

const TEXT_MIN = 4.5; // texto (WCAG 1.4.3)
const UI_MIN = 3; // bordas de controle, foco, ícones e gráficos (WCAG 1.4.11)

const BACKGROUNDS = ['--color-bg', '--color-surface', '--color-bg-subtle'];

const TEXT_PAIRS = [
  ...[
    '--color-text',
    '--color-text-muted',
    '--color-link',
    '--status-approved',
    '--status-pending',
    '--status-rejected',
    '--status-neutral',
    '--status-blocked',
  ].flatMap((fg) => BACKGROUNDS.map((bg) => [fg, bg])),
  ['--color-on-primary', '--color-primary'], // botão primário
  ['--color-on-primary', '--status-rejected'], // botão danger
  ['--status-blocked', '--color-hatch'], // status "Bloqueada" sobre a hachura
  ['--color-text', '--color-highlight-bg'],
  ['--color-text-on-highlight', '--color-highlight-bg'],
  ['--color-link', '--color-highlight-bg'],
];

// Hover e foco dos botões do Material: uma camada de cor com 10% de opacidade (o maior valor do
// Material 3) por cima do fundo do botão. O texto precisa continuar legível nesse estado.
const STATE_LAYER_OPACITY = 0.1;
const STATE_PAIRS = [
  // [texto, camada de estado, fundo do botão]
  ['--color-on-primary', '--color-text', '--color-primary'], // botão cheio
  ['--color-on-primary', '--color-text', '--status-rejected'], // botão danger
  ['--color-link', '--color-link', '--color-bg'], // botão de texto e com contorno
  ['--color-link', '--color-link', '--color-surface'],
];

const UI_PAIRS = [
  ...BACKGROUNDS.map((bg) => ['--color-border-strong', bg]),
  ...BACKGROUNDS.map((bg) => ['--color-focus-ring', bg]),
  ['--color-focus-ring', '--color-highlight-bg'],
  ...BACKGROUNDS.map((bg) => ['--color-primary', bg]), // contorno do botão primário
  // Regra do CLAUDE.md: o accent não vai sobre --color-bg-subtle.
  ['--color-accent', '--color-bg'],
  ['--color-accent', '--color-surface'],
];

const css = readFileSync(TOKENS_FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Conteúdo entre as chaves do primeiro bloco que começa em `start` (busca a partir de `from`). */
function blockBody(source, start, from = 0) {
  const at = source.indexOf(start, from);
  if (at === -1) throw new Error(`Bloco não encontrado no tokens.css: ${start}`);
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`Bloco sem fechamento no tokens.css: ${start}`);
}

function declarations(body) {
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

const light = declarations(blockBody(css, ':root {'));
const darkBySystem = declarations(
  blockBody(
    blockBody(css, '@media (prefers-color-scheme: dark)'),
    ":root:not([data-theme='light'])",
  ),
);
const darkByChoice = declarations(blockBody(css, ":root[data-theme='dark']"));

function resolve(name, vars, seen = []) {
  if (seen.includes(name)) throw new Error(`Referência circular: ${[...seen, name].join(' → ')}`);
  const value = vars[name];
  if (value === undefined) throw new Error(`Token não definido: ${name}`);
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolve(ref[1], vars, [...seen, name]);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} não é uma cor #rrggbb: ${value}`);
  return value;
}

function luminance(hex) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Cor resultante de `over` com opacidade `alpha` por cima de `base`. */
function blend(over, base, alpha) {
  const channels = (hex) =>
    hex
      .slice(1)
      .match(/../g)
      .map((h) => parseInt(h, 16));
  const [o, b] = [channels(over), channels(base)];
  return `#${o
    .map((c, i) =>
      Math.round(c * alpha + b[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const failures = [];

const differences = [
  ...new Set([...Object.keys(darkBySystem), ...Object.keys(darkByChoice)]),
].filter((name) => darkBySystem[name] !== darkByChoice[name]);
if (differences.length > 0) {
  failures.push(`Os dois blocos do tema escuro estão diferentes em: ${differences.join(', ')}`);
}

const themes = [
  ['claro', light],
  ['escuro', { ...light, ...darkBySystem }],
];

for (const [theme, vars] of themes) {
  console.log(`\nTema ${theme}`);
  for (const [pairs, min, kind] of [
    [TEXT_PAIRS, TEXT_MIN, 'texto'],
    [UI_PAIRS, UI_MIN, 'interface'],
  ]) {
    for (const [fg, bg] of pairs) {
      const ratio = contrast(resolve(fg, vars), resolve(bg, vars));
      const ok = ratio >= min;
      const line = `${fg} sobre ${bg}: ${ratio.toFixed(2)}:1 (${kind}, mínimo ${min}:1)`;
      console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${line}`);
      if (!ok) failures.push(`Tema ${theme}: ${line}`);
    }
  }
  for (const [fg, layer, bg] of STATE_PAIRS) {
    const background = blend(resolve(layer, vars), resolve(bg, vars), STATE_LAYER_OPACITY);
    const ratio = contrast(resolve(fg, vars), background);
    const ok = ratio >= TEXT_MIN;
    const line = `${fg} sobre ${bg} em hover/foco (camada ${layer}): ${ratio.toFixed(2)}:1 (texto, mínimo ${TEXT_MIN}:1)`;
    console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${line}`);
    if (!ok) failures.push(`Tema ${theme}: ${line}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problema(s) de contraste:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nTodos os pares passam no contraste mínimo.');
