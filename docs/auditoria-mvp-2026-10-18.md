# Auditoria técnica e execução do MVP — 18/10/2026

Prazo de implementação: **27/10/2026**. Depois: correções, validação, documentação e apresentação. Esta auditoria trata do software; não valida cientificamente o instrumento nem autoriza coleta real.

## Evidências do estado inicial

- Repositório Git em `app-mobile/`, commit `5f35090`, árvore inicialmente limpa.
- Expo `~57.0.29`, React Native `0.86.3`, JavaScript e Expo Router; backend CommonJS com Express 5 e `pg`. Node local: `v24.18.0`.
- `npm.cmd test`: 23 testes aprovados. Cobrem catálogo, questionário, revisão, preservação das respostas e navegação. Hooks e componentes nativos são simulados; os testes de navegação usam também o redutor instalado do Expo Router. Não constituem teste E2E em aparelho.
- `npm.cmd run lint` e `npm.cmd run typecheck`: aprovados antes das mudanças.
- Conexão PostgreSQL comprovada por consulta de metadados. As colunas de `setores`, `periodos_coleta`, `participacoes` e `respostas` correspondem ao SQL versionado. Nenhuma resposta existente foi lida.
- Não havia servidor ativo em `127.0.0.1:3000`. Os quatro GETs existiam no código, mas a alegação de teste manual anterior não substituiu uma verificação nesta sessão.
- O conteúdo do `.env` não foi exibido nem alterado. `backend/.env` já estava ignorado pelo Git.

## Implementado antes desta entrega

| Componente | Estado e limite da comprovação |
| --- | --- |
| Elegibilidade | Interface com três autodeclarações: idade, vínculo e atividade. Não representa validação ética dos critérios. Sem teste automatizado específico dessas telas. |
| TCLE e recusa | Interface e navegação existentes; termo explicitamente provisório e download indisponível. Sem registro persistente de consentimento. |
| Setor | Lista provisória fixa; seleção em estado local da tela. Não chega ao questionário ou ao backend. |
| Questionário | 31 questões, alternativas específicas, resposta única e estado em memória acima das rotas; coberto pelos testes existentes. |
| Revisão | Sete blocos, contagem, correção de itens e preservação das demais respostas; coberta por testes. Botão de confirmação/envio propositalmente desabilitado. |
| Backend | Conexão e GETs `/health`, `/db-health`, `/setores`, `/periodos`. Não havia parser JSON, POST, transação ou teste de backend. |
| Banco | Quatro tabelas, FKs, questão entre 1–31 e chave composta contra duplicação de questão dentro da participação. |
| Painel | Ausente; autenticação, autorização, consultas agregadas e supressão ainda não implementadas. |

## Problemas, incompatibilidades e dependências

1. O app guarda `{ Q1: alternativa, ... }`; PostgreSQL espera linhas com `questao_numero` inteiro e texto de alternativa. Será necessário converter explicitamente no cliente.
2. O app guarda nomes provisórios de setores; o banco exige ID de setor existente. A integração deverá usar `/setores`, persistir o ID no contexto e limpar a seleção ao encerrar a participação.
3. Não existe seleção/configuração de período no app. É necessário carregar `/periodos` e definir um período vigente de demonstração, inclusive comportamento quando houver nenhum ou mais de um.
4. `VARCHAR(50)` comporta todas as alternativas atuais. Q23 usa escala de saúde; Q17–Q22/Q24–Q27 usam intensidade; Q28–Q31 aceitam apenas `Sim`/`Não`. Não se pode aplicar uma escala única a todas as questões.
5. O SQL sozinho permite participações sem respostas, respostas incompletas e alternativas arbitrárias. Nesta etapa, a API garante a completude e o domínio. Escritas diretas no banco continuam exigindo controle de acesso; não se deve classificar toda linha legada como participação válida automaticamente.
6. `BIGINT` é retornado como string por `pg`; o serviço preserva esse valor sem conversão potencialmente imprecisa para `Number`.
7. Não há identificação pessoal, restrição de uma participação por pessoa, idempotência de requisição ou política validada de duplicidade. Antes da integração com reenvios, implementar chave aleatória de idempotência por envio, sem identificação pessoal. Isso evita duplicação técnica e não comprova unicidade de pessoa.
8. Não há versão do instrumento/TCLE nem classificação persistente de dados de demonstração. Para esta entrega, schemas temporários isolam os dados fictícios. Não misturar demonstração e futura coleta real.
9. A integração mobile depende de URL configurável e acesso do dispositivo à API. O servidor agora usa loopback por padrão; acesso externo exigirá `HOST` explícito. Para Expo Web/painel, configurar origem e CORS de forma restrita quando necessário.
10. Ordem de execução: contrato/API e banco → estado de setor/período e envio mobile → autenticação e agregação → painel e testes integrados. A proteção de privacidade pertence ao backend, não apenas à interface do painel.

## Pendências científicas e éticas

- Conferir texto, versão e origem das 31 questões com o documento aprovado. O arquivo menciona o Apêndice A, mas o documento original não foi localizado no repositório; não foi possível atestar a transcrição contra essa fonte.
- Validar as dimensões e polaridades que já estão no catálogo. Sua existência no código não é evidência científica. Nenhuma foi modificada ou usada para calcular pontuação nesta entrega.
- Definir e validar codificação, reversão de itens, composição por dimensão, tratamento de ausências e limites de interpretação/risco. Bloqueiam os escores e classificações, não a persistência literal das respostas.
- Validar TCLE definitivo, critérios de elegibilidade, setores, período, condições de tratamento dos dados e autorizações éticas aplicáveis antes de qualquer coleta real.
- Q28–Q31 devem permanecer fora do cálculo psicométrico. A definição da apresentação do alerta coletivo deve ser validada; qualquer alerta futuro deve obedecer à supressão de grupos pequenos.

O MVP de demonstração pode apresentar agregações descritivas aprovadas, com dados fictícios e sem rotular risco clínico/psicométrico. Se a validação científica não chegar até 27/10, o cálculo correspondente permanece indisponível e essa limitação deve constar na apresentação.

## Plano priorizado

| Prioridade | Data-alvo | Entrega e critério de aceite |
| --- | --- | --- |
| P0 | 18–19/10 | Recebimento JSON, validação de setor/período/31 alternativas, transação e testes HTTP + PostgreSQL de sucesso, inválidos e rollback. **Implementado nesta entrega**, com resultados em `backend/README.md`. |
| P0 | 20–21/10 | Carregar setor/período reais da API de demonstração; contexto completo, confirmação e POST; botão bloqueado durante envio; sucesso somente após API confirmar; preservar respostas em falhas e tratar reenvio com idempotência sem dados pessoais. Testar sucesso, falha e resposta perdida. |
| P0 | 22–23/10 | Painel web mínimo com autenticação e autorização no backend; credenciais fora do código; nenhuma rota de consulta individual; testar acesso negado e autorizado. |
| P0 | 24–25/10 | Agregações por setor/período; considerar apenas participações completas/válidas; suprimir resultados abaixo de cinco, inclusive contagem exata, alertas, filtros e combinações. Testar grupos com 0–4 e 5+, combinações e possibilidades de inferência por totais complementares. Q28–Q31 apenas no alerta agregado. |
| P0 | 26–27/10 | Testes integrados e roteiro reproduzível com dados fictícios; executar em aparelho/navegador; corrigir regressões, conferir configuração e preparar versão demonstrável. Coleta real continua condicionada às definições éticas. |
| P1 | Se houver folga | Melhorias adicionais de acessibilidade e acabamento, diagnósticos operacionais sem dados sensíveis, automação de checks e facilidades de preparação/restauração do ambiente de desenvolvimento. |
| P2 | Após o MVP | Recursos administrativos adicionais, exportações cuidadosamente avaliadas, novas visualizações e análises cientificamente validadas que excedam o escopo mínimo. |

Até 19/10, obter do responsável as definições científicas/éticas e a lista de setores, para reduzir retrabalho. O cronograma é um plano de execução, não uma comprovação de funcionalidades futuras.

## Limite da primeira entrega

A API de persistência e sua demonstração isolada foram implementadas. As quatro rotas anteriores passaram por testes HTTP e PostgreSQL. O frontend e o SQL original foram preservados. O aplicativo ainda não envia respostas; painel, autenticação, agregações, supressão, idempotência e uso em aparelho permanecem pendentes. Não houve commit nem push.
