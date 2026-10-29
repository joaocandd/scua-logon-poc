# ADR 0005 · Formulários com Signal Forms

- **Status:** aceita
- **Data:** 29/10/2026

## Contexto

A tela de entrada (`/entrar`) é o primeiro formulário do app. O editor de regras de jornada (fluxo B) vai ter muitos campos, validações cruzadas, estado de "alteração não salva" e envio com carregando. O Angular 22 oferece três jeitos de fazer formulários:

- **Reactive Forms** (`FormGroup`, `FormControl`): maduro e bem documentado, mas o valor e o estado chegam como Observable (`valueChanges`) e precisam virar signal com `toSignal`.
- **Template-driven** (`ngModel`): simples, mas a validação fica espalhada no template e é difícil de testar.
- **Signal Forms** (`@angular/forms/signals`): API pública desde o Angular 22.0. O formulário nasce de um `signal` com o modelo; valor, erros, `touched` e `submitting` são signals.

O CLAUDE.md já pede signals para o estado.

## Decisão

1. Usar Signal Forms: `form(modelo, regras, { submission })`, `[formField]` em cada controle nativo e `<form [formRoot]>` no formulário. O `formRoot` põe `novalidate` e chama o `submission.action` só quando o formulário é válido; senão, chama o `onInvalid`.
2. O `Field` do design system continua cuidando do rótulo, da ajuda e do erro (ADR 0004). A tela passa a mensagem para `[error]`. O Field não depende de nenhuma API de formulário.
3. Padrão de erro nas telas:
   - Os erros de campo só aparecem depois da primeira tentativa de envio. Quem passa pelos campos com Tab não vê erro de campo vazio.
   - No envio inválido, o foco vai para o primeiro campo com problema (`focusBoundControl()`), depois que a tela mostra o erro (`afterNextRender`). Assim o leitor de tela já lê o campo como inválido.
   - Erro que não é de um campo, como credencial inválida, aparece em texto acima do formulário, numa região `role="alert"` que existe antes do erro.

## Alternativas consideradas

- **Reactive Forms.** Seria a escolha segura, com mais exemplos na internet. Mas misturaria RxJS e signals no mesmo formulário, e o estado de envio (`submitting`) teria que ser feito à mão.
- **Signals puros, sem biblioteca de formulário.** Dá conta de dois campos, mas não do fluxo B: validação, `dirty` e envio teriam que ser reinventados.

## Consequências

- Estado do formulário e da tela no mesmo modelo (signals), sem `subscribe`.
- API nova: há menos exemplos e pode mudar nas próximas versões. A documentação oficial (angular.dev, guia "Signal Forms") é a referência.
- O `[formField]` põe o atributo nativo `required` nos campos com a regra `required()`. O leitor de tela anuncia "obrigatório" e o `novalidate` do `formRoot` impede o balão de erro do navegador.
- O Signal Forms injeta uma `<style>` no `<head>` (animações `ng-valid` e `ng-invalid`, usadas para perceber a validade nativa dos inputs). Uma política de CSP rígida no produto real vai precisar do `CSP_NONCE`.
