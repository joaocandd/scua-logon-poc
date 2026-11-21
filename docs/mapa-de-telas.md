# Mapa de telas · console atual e proposta

Para onde vai cada item do menu do console atual do Scua Logon, e como ele está na prova de conceito. Serve para mostrar que a proposta cobre o sistema inteiro, mesmo onde a PoC ainda não construiu a tela.

Status na PoC:

- **pronto**: a tela existe e funciona com os dados fictícios;
- **parcial**: parte da tela existe; o resto aparece como fora do escopo;
- **fora do escopo**: a área existe no menu e diz o que ficaria ali, sem a tela;
- **a verificar**: falta confirmar com o inventário do console atual o que o item faz.

| Item do menu atual | Onde fica na proposta | Status na PoC |
|---|---|---|
| Home | **Hoje** (`/hoje`): pedidos aguardando, alertas, estações agora, pedidos de hoje por status e horas extras | pronto |
| Usuários | **Pessoas** (`/pessoas`): colaboradores com matrícula, cargo, grupo, regra, estação agora e horas extras dos últimos 30 dias, com busca e filtros | pronto (só leitura) |
| Jornada de trabalho | **Regras de jornada** (`/regras`), fluxo B | pronto |
| Extensão de jornada | **Aprovações** (`/aprovacoes`), fluxo A, e o link do e-mail (`/aprovacao/:token`) | pronto |
| Relatórios | **Relatórios** (`/relatorios`): horas extras, tempo de bloqueio e ausência | pronto |
| Carga de Dados | **Pessoas** (`/pessoas`), como importação de colaboradores e grupos | fora do escopo |
| Estações | **Estações** (`/estacoes`): estado de cada estação, regra e última atividade | pronto |
| Administrador | **Configurações** (`/configuracoes`): permissões de acesso e quem administra | parcial (só o custo médio da hora extra e o restaurar dados de demonstração) |
| Pausas | Provavelmente nos intervalos de **Regras de jornada** | a verificar |
| Liberações por Diretoria | Provavelmente nas regras de quem aprova em **Regras de jornada** e em **Aprovações** | a verificar |
| Tempo de Bloqueio | **Relatórios** › bloco Tempo de bloqueio | pronto |
| Gráfico de Ausência | **Relatórios** › bloco Ausência | pronto |
| Logs | **Relatórios** › **Auditoria** (`/relatorios/auditoria`) | pronto |
| Perguntas frequentes | **Ajuda** (`/ajuda`), no menu do usuário | pronto |
| Sair | Menu do usuário › **Sair** | pronto |

## O menu da proposta

Sete áreas no menu principal, na ordem do uso diário: Hoje, Aprovações, Estações, Pessoas, Regras de jornada, Relatórios e Configurações. No celular, Hoje e Aprovações ficam na barra inferior e o resto no "Mais". No menu do usuário: tema, Ajuda e Sair.

Os 15 itens do menu atual cabem nessas sete áreas porque relatórios parecidos viram blocos de uma tela só (Tempo de Bloqueio, Gráfico de Ausência e Logs vão para Relatórios) e porque cadastro e importação ficam juntos (Usuários e Carga de Dados vão para Pessoas).

## Observações

- Os números de Relatórios, do gráfico de horas extras do Hoje e a última atividade das Estações são **fictícios**: saem de uma série com semente fixa (`src/app/mocks/history.ts` e `src/app/mocks/workstation-info.ts`, ADR 0021).
- Pausas e Liberações por Diretoria ficam como "a verificar" até o inventário do console atual dizer o que cada uma faz.
