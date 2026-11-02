# ScuaLogonPoc

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Aprovação pelo link do e-mail (`/aprovacao/:token`)

Página pública que o gestor abre pelo e-mail, sem o menu do app (ADR 0010). Tokens de exemplo da API simulada, em `src/app/mocks/fixtures/approval-tokens.ts`:

| Link | O que mostra |
|---|---|
| `/aprovacao/valido-ped-02` | Pedido de Lucas Bittencourt, que passa de 2 h extras no dia |
| `/aprovacao/valido-ped-04` | Pedido de Mateus Farias, que quebra a interjornada de 11 h |
| `/aprovacao/expirado-ped-22` | "Este link expirou. O pedido de Ana Ribeiro venceu às 18h30." |
| `/aprovacao/usado-ped-13` | "Este pedido já foi aprovado por Bianca às …" (a hora depende de quando o app abre) |
| `/aprovacao/qualquer-outro` | Link inválido |

Também valem `?simular=erro` (o servidor não responde) e `?simular=decidido` (outra pessoa decide antes). Os dados ficam na memória do navegador: recarregar a página volta ao começo.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
