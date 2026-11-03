# ADR 0016 · Login pela API simulada: quem entra vira o usuário atual

- **Status:** aceita
- **Data:** 30/10/2026 (commit `82bf3cc`); registrada em 03/11/2026

## Contexto

A tela de entrada (`/entrar`, ADR 0008) nasceu com a autenticação simulada dentro do serviço `Auth`: uma espera fixa de 800 ms, a senha "erro" para credencial inválida e uma sessão só na memória, com o texto digitado como nome. A conta corporativa entrava como "Ana Ribeiro".

O menu do usuário, por outro lado, mostrava quem a API simulada informava em `/api/eu` (ADR 0007): Renata Albuquerque. Quem entrava como "marina.alves" via "Renata" no menu. Eram duas respostas para a mesma pergunta, e a regra do "servidor" (a senha que falha) ficava no navegador, fora da API.

A caixa de aprovações também depende de quem está usando o app: as decisões dessa pessoa aparecem como "por você" e ganham o "Desfazer" (ADR 0009). Ela precisa de uma pessoa só, vinda do mesmo lugar que o resto dos dados.

## Decisão

1. **O login passa pela API simulada**, como os outros dados (ADR 0005):
   - `POST /api/sessao` com `{ username, password }`. Campos vazios respondem 422 ("Informe o usuário e a senha."), a senha "erro" responde 401, e qualquer outro par preenchido entra.
   - `POST /api/sessao/corporativa` simula o login único da empresa e sempre entra.
   - As duas devolvem a mesma pessoa: Renata Albuquerque, a usuária da demonstração, que aprova todos os grupos (`CURRENT_USER_ID` em `mocks/fixtures/employees.ts`).
2. **O `Auth` só conversa com a API.** Usa o `HttpClient`, transforma o 401 em `InvalidCredentialsError` e repassa os outros erros. A tela mostra a mensagem com `apiErrorMessage` (`shared/api-error.ts`). Com o servidor fora do ar, aparece "Não conseguimos falar com o servidor. Tente de novo em instantes.", nunca um código HTTP.
3. **O `CurrentUser` é a única fonte de "quem está usando".** Depois do login, o `Auth` chama `setUser` com a pessoa que a API devolveu. Sem login (quem abre uma página do app direto), o `CurrentUser` pergunta a `/api/eu`. O menu do usuário e a caixa de aprovações leem só dele.
4. **O `CurrentUser` só é criado depois do login.** O `Auth` busca o serviço no `Injector` na hora de entrar. Se fosse criado antes, ele chamaria `/api/eu` ao abrir `/entrar` e baixaria a API simulada antes de alguém tentar entrar. O pacote inicial não mudou (317,38 kB na época).
5. **A espera é a da API simulada** (300 a 800 ms), e não um tempo fixo no `Auth`. Por isso o `?simular=` também vale no login: `erro` derruba a entrada e `lento` alonga o carregando. Com `sem-permissao`, `/api/eu` e as duas rotas de sessão continuam respondendo: a pessoa entra, só não vê os dados (ADR 0009).

## Alternativas consideradas

- **Manter a regra no `Auth`, sem HTTP.** Menos código, e a tela de entrada nunca baixaria a API simulada. Mas o menu continuaria mostrando outra pessoa, e trocar pelo login real mudaria o `Auth` e a tela.
- **Entrar como a pessoa digitada**, procurando o usuário nas fixtures. Seria mais realista, mas a demonstração dependeria de saber um usuário que existe. Além disso, cada grupo tem um gestor de área e a Renata: com outra pessoa, a caixa de aprovações mostraria um grupo só, ou nenhum.
- **Login real com o provedor da empresa.** Fora do escopo da PoC (CLAUDE.md). O botão "Entrar com conta corporativa" só simula.

## Consequências

- Trocar pelo login real é mudar quem responde a `/api/sessao` (ou apontar o `Auth` para o provedor). A tela e o `CurrentUser` continuam iguais. [CONFIRMAR] como o Scua Logon autentica hoje (sessão por cookie, token ou login corporativo), porque isso define o que o `Auth` guarda.
- A sessão fica só na memória. Recarregar a página "sai", mas o `/api/eu` devolve a mesma pessoa, então nada muda na demonstração.
- Não há proteção de rota nem "Sair". Quem abre `/aprovacoes` sem entrar usa o app como a usuária da demonstração. O `signOut` saiu porque ninguém o usava. [CONFIRMAR] se a demo precisa mandar para `/entrar` quem não entrou.
- A tela de entrada só baixa a API simulada no primeiro "Entrar". O Lighthouse do `/entrar` mede a página sem esse download (docs/metricas.md).
- Testes: `auth.spec.ts`, `current-user.spec.ts` e `handlers.spec.ts`, mais o `e2e/sign-in.spec.ts`, que confere o nome no menu depois de entrar, a senha "erro" e o servidor fora do ar.
