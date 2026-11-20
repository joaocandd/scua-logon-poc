# ADR 0022 · Relógio de demonstração

- **Status:** aceita
- **Data:** 20/11/2026

## Contexto

Os dados simulados são relativos a "agora" (ADR 0005), e o motor de regras decide o estado de cada estação pela hora (ADR 0006). A apresentação é num sábado às 15h: com o relógio real, quase todas as estações aparecem "Fora do expediente", não há gente em jornada e parte dos cenários do roteiro some.

## Decisão

Um relógio do app em `src/app/shared/clock.ts`: `now()` devolve o relógio do computador mais um deslocamento. O parâmetro `?relogio=2026-11-24T17:40` (horário de São Paulo) liga o relógio de demonstração antes de o app começar (`main.ts`):

- o deslocamento é o instante escolhido menos o instante real em que o relógio foi ligado, então o tempo anda normalmente dali;
- fica guardado no `sessionStorage` da aba: vale em todas as telas e ao recarregar, até o botão **Desligar** da faixa no topo (que também tira o parâmetro da URL e recarrega);
- a API simulada (banco, fixtures, série fictícia), o motor de regras, os textos "há X s" e o `injectNow` leem `now()`. O Toast continua no relógio real: ele só mede duração.

Terça, 24/11, às 17h40 é o horário do roteiro: todos os cenários foram conferidos nele (`e2e/demo-clock.spec.ts`).

## Alternativas consideradas

- **Trocar o `Date` global** (como o `page.clock` do Playwright). Pega tudo sem mudar o código, mas é mágica difícil de explicar na defesa e afeta bibliotecas.
- **Fixtures fixas num dia útil.** Os dados deixariam de ser relativos a "agora", e o modo demo ao vivo e os prazos de expiração deixariam de fazer sentido.
- **Guardar no localStorage.** Ficaria ligado em outras abas e depois da apresentação, sem ninguém perceber.

## Consequências

- Sem o parâmetro, nada muda: o deslocamento é zero e a faixa não aparece.
- Código novo que precise de "agora" deve usar `now()` ou `injectNow`, não `Date.now()`.
- Cada aba precisa do parâmetro uma vez; o roteiro e o README trazem os endereços.
