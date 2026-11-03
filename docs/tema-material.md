# Tema do Angular Material a partir dos tokens

Referência para a fase 1 da migração: as telas antigas da Scua, que usam o Angular Material, recebem a marca nova sem trocar de componentes. O app desta PoC não usa o Material (ADR 0014); este é o tema que ele usava até 03/11/2026 (ADR 0002), conferido no contraste nos temas claro e escuro.

A regra é a mesma do app: **os tokens do `tokens.css` são a única fonte de cor**. O Material só aponta para eles.

## Por que não basta o tema gerado

- O schematic `ng generate @angular/material:theme-color` com #C2560A gera paletas tonais, mas o primário do tema claro é o tom 40 (#9E4300), e não o laranja da marca. No tema escuro seria o tom 80 (#FFB691), que não é o nosso.
- O hover e o foco do Material 3 clareiam o botão cheio com uma camada branca. Com texto branco sobre #C2560A, o contraste cai de 4,54:1 para 3,87:1 e reprova.

## Passo a passo

1. Gere as paletas com `ng generate @angular/material:theme-color`, primária #C2560A. O arquivo gerado (`_theme-colors.scss`) alimenta as cores que não têm token: superfícies em camadas, secundária e terciária.
2. Garanta que o `color-scheme` é definido nos mesmos seletores do tema escuro do `tokens.css` (já é assim). O `light-dark()` do Material e as nossas variáveis trocam juntos.
3. Use o SCSS abaixo no estilo global, depois do `tokens.css`.
4. Confira o contraste dos estados dos botões (fim desta página).

## Mapeamento: tokens → tokens de sistema do Material

| Token de sistema do Material | Nosso token |
|---|---|
| `primary` | `--color-primary` |
| `on-primary` | `--color-on-primary` |
| `background` | `--color-bg` |
| `on-background` | `--color-text` |
| `surface` | `--color-surface` |
| `on-surface` | `--color-text` |
| `on-surface-variant` | `--color-text-muted` |
| `outline` | `--color-border-strong` |
| `outline-variant` | `--color-border` |
| `error` | `--status-rejected` |

Componentes:

| Ajuste | Valor |
|---|---|
| Raio de botões e campos | `--radius-sm` (8 px) |
| Raio de cards | `--radius-lg` (16 px) |
| Anel de foco | 2 px (`--focus-ring-width`) sólido em `--color-focus-ring` |
| Camada de hover e foco do botão cheio | `--color-text` (escurece no claro, clareia no escuro, sempre aumentando o contraste) |
| Rótulo e camada dos botões de texto, com contorno e "protected" | `--color-link` (#C2560A como texto reprova sobre a areia) |
| Tipografia | `--font-sans` |

## SCSS

```scss
@use '@angular/material' as mat;
@use './styles/theme-colors' as theme;

// Tema do Material 3. `color-scheme` (definido no tokens.css) escolhe claro ou escuro.
html {
  @include mat.theme(
    (
      color: (
        primary: theme.$primary-palette,
        tertiary: theme.$tertiary-palette,
        theme-type: color-scheme,
      ),
      typography: var(--font-sans),
      density: 0,
    )
  );

  // O Material usa os nossos tokens: primário exato (#C2560A) e tema escuro vindo do tokens.css.
  @include mat.theme-overrides(
    (
      primary: var(--color-primary),
      on-primary: var(--color-on-primary),
      background: var(--color-bg),
      on-background: var(--color-text),
      surface: var(--color-surface),
      on-surface: var(--color-text),
      on-surface-variant: var(--color-text-muted),
      outline: var(--color-border-strong),
      outline-variant: var(--color-border),
      error: var(--status-rejected),
    )
  );

  @include mat.button-overrides(
    (
      filled-container-shape: var(--radius-sm),
      outlined-container-shape: var(--radius-sm),
      protected-container-shape: var(--radius-sm),
      text-container-shape: var(--radius-sm),
      tonal-container-shape: var(--radius-sm),
      // Hover e foco não podem baixar o contraste. O padrão do Material clareia o botão cheio
      // (branco sobre #C2560A cai para 3,87:1) e usa #C2560A nos rótulos dos outros botões.
      filled-state-layer-color: var(--color-text),
      protected-label-text-color: var(--color-link),
      protected-state-layer-color: var(--color-link),
      outlined-label-text-color: var(--color-link),
      outlined-state-layer-color: var(--color-link),
      text-label-text-color: var(--color-link),
      text-state-layer-color: var(--color-link),
    )
  );

  @include mat.form-field-overrides(
    (
      filled-container-shape: var(--radius-sm),
      outlined-container-shape: var(--radius-sm),
    )
  );

  @include mat.card-overrides(
    (
      elevated-container-shape: var(--radius-lg),
      filled-container-shape: var(--radius-lg),
      outlined-container-shape: var(--radius-lg),
    )
  );
}

// Anel de foco dos componentes do Material: 2 px na cor de foco.
@include mat.strong-focus-indicators(
  (
    border-width: var(--focus-ring-width),
    border-style: solid,
    border-color: var(--color-focus-ring),
  )
);

// Esses componentes do Material já desenham o próprio anel (strong-focus-indicators acima)
// ou o realce do campo; um contorno global de :focus-visible viraria um segundo anel.
.mat-mdc-button-base:focus-visible,
.mat-mdc-input-element:focus-visible,
.mat-mdc-select:focus-visible {
  outline: none;
}
```

## Contraste dos estados dos botões

O Material 3 desenha o hover e o foco com uma camada de cor de 10% de opacidade (o maior valor dele) por cima do fundo do botão. O texto precisa continuar com 4,5:1 nesse estado. O `scripts/check-contrast.mjs` já confere o botão cheio e o danger (os mesmos do nosso Button). Para as telas com Material, acrescente em `STATE_PAIRS`:

```js
['--color-link', '--color-link', '--color-bg'], // botão de texto e com contorno
['--color-link', '--color-link', '--color-surface'],
```

Em 03/11/2026, esses pares davam 6,34:1 (fundo e superfície) no tema claro e 6,35:1 e 5,73:1 no escuro.

## Cuidados

- Atualizações do Material podem renomear os tokens de override. O build falha com mensagem clara quando isso acontece.
- Cada componente do Material que entrar precisa ser conferido nos dois temas: estados de hover, foco, erro e desabilitado.
- O tema do Material acrescenta umas 120 variáveis `--mat-sys-*` ao CSS crítico (cerca de 10 kB antes do gzip). Só vale a pena em telas que usam os componentes dele.
