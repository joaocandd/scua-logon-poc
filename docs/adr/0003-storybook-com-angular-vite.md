# ADR 0003 · Storybook com o framework `@storybook/angular-vite`

- **Status:** aceita
- **Data:** 28/10/2026

## Contexto

O design system precisa de um Storybook. Para Angular, o Storybook 10 tem dois frameworks:

- `@storybook/angular`: estável, mas compila com webpack e exige o `@angular-devkit/build-angular`, o builder antigo, que o Angular 22 já trata como obsoleto. O app usa o `@angular/build` (esbuild e Vite).
- `@storybook/angular-vite`: recomendado pela documentação do Storybook para Angular 21 ou mais novo. Usa Vite e o `@angular/build`. Está **em preview**, com versão estável prevista para o Storybook 11.

## Decisão

Usar o `@storybook/angular-vite` (10.6), com os addons `a11y`, `docs` e `themes`:

- Os alvos `storybook` e `build-storybook` do `angular.json` declaram `styles: ["src/styles.scss"]`, porque esse builder não herda os estilos do build do app.
- Zoneless, como o app (é o padrão do builder).
- A página "Fundamentos" é feita de stories, não de MDX solto, para que o addon de acessibilidade e o botão claro/escuro também valham nela.
- O CI roda `npm run build-storybook` para pegar stories quebradas.

## Alternativas consideradas

- **`@storybook/angular` (webpack).** Estável, mas traz cerca de 400 pacotes a mais (webpack e o builder antigo) e um segundo jeito de compilar o mesmo código.
- **Sem Storybook,** com uma rota de catálogo no próprio app. Menos dependências, mas perde o addon de acessibilidade, os controles e a documentação automática que a banca espera ver.

## Consequências

- Uma só cadeia de build (`@angular/build`) para app e Storybook.
- Por ser preview, pode haver mudanças até o Storybook 11. Se algo travar, a volta para o `@storybook/angular` é trocar o framework no `.storybook/main.ts` e os builders no `angular.json`; as stories não mudam.
- O `@storybook/angular-vite` declara `@angular/animations` como dependência obrigatória, embora não o use. O pacote fica instalado (o npm instala as dependências obrigatórias sozinho), mas o nosso código não deve usá-lo: no Angular 22 ele está obsoleto.
