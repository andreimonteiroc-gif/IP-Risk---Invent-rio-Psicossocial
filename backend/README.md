# Backend — persistência e integração P0

**Atualização do painel web e do fluxo mobile:** resultados são agrupados por mega setor e período, com limiar de cinco participações e publicação imutável. O app lê `/mega-setores` e envia `mega_setor_id`; a migração aditiva `sql/005_participation_mega_sector.sql` mantém `setor_id` nas linhas antigas e grava `macroarea_id` nas novas. As migrações não são aplicadas no startup. O painel está descrito em [`Painel Web por mega setor`](../docs/painel-web-mega-setores.md) e [`web-admin/README.md`](../web-admin/README.md).

Para ambientes já provisionados, aplique na ordem as migrações `003_admin_privacy_and_sectors.sql`, `004_admin_mega_sectors.sql` e `005_participation_mega_sector.sql`, após confirmar o banco-alvo e o backup. A 005 depende da tabela `macroareas` criada pela 003. A rotina de inicialização da API não aplica migrações automaticamente.

**Atualização de 21/10/2026:** autenticação, consultas administrativas, IER versionado e catálogo configurável de oito macroáreas/33 subdivisões estão implementados, sem frontend administrativo. O roteiro atual está em [Backend administrativo, auditoria e demonstração](../docs/backend-administrativo-2026-10-21.md). Para testar PostgreSQL sem acessar a conexão principal, use `npm.cmd run test:isolated`; para demonstrar, configure a conta com `npm.cmd run admin:setup -- profissional.local` e execute `npm.cmd run demo:admin`. As instruções atuais prevalecem sobre o histórico abaixo.

Estado atual, configuração para navegador/iPhone, idempotência, resultados e lista exata dos arquivos desta segunda etapa: [Integração app/API](../docs/integracao-api-demonstracao.md). O restante deste documento mantém os detalhes da persistência e o histórico da primeira entrega; as atualizações abaixo prevalecem.

Implementação de demonstração com dados fictícios. Não habilita coleta real. O TCLE e as autorizações para coleta real continuam pendentes; o cálculo segue as regras finais fornecidas pelo responsável em 21/10/2026.

## Executar e testar

No PowerShell, a partir de `app-mobile/backend` (usar `npm.cmd` evita o bloqueio local de execução de `npm.ps1`):

```powershell
npm.cmd test
npm.cmd run test:isolated
```

O primeiro comando testa HTTP com banco simulado e verifica o contrato de alternativas contra as 31 questões reais do aplicativo. O segundo cria um cluster PostgreSQL descartável independente em loopback, aplica em ordem `001`, `002`, `003` e `004` em schemas aleatórios e usa exclusivamente dados fictícios. Não carrega `.env` nem a conexão principal. Exige binários PostgreSQL instalados (configure `PG_BIN` se necessário). Remove o cluster ao encerrar. O comando avançado `test:integration` exige `TEST_DATABASE_URL` explícita de um banco local separado `inventario_test_*`; não possui fallback para `db.js`.

Verificações do app, a partir de `app-mobile`:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
```

## Demonstração manual isolada

No primeiro terminal, em `app-mobile/backend`:

```powershell
npm.cmd run demo
```

O comando legado `demo` agora exige `TEST_DATABASE_URL` explícita de um banco local separado `inventario_test_*`; cria um schema `inventario_demo_<sufixo>` com setor e períodos fictícios e inicia a API em `127.0.0.1:3000`. Não usa a conexão de `.env`. Para preparar automaticamente a instância independente e os cenários administrativos, prefira `demo:admin`, conforme o roteiro de 21/10. Se a porta estiver ocupada, configure `PORT`.

No segundo terminal, também em `app-mobile/backend`:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/db-health
Invoke-RestMethod http://127.0.0.1:3000/mega-setores
Invoke-RestMethod http://127.0.0.1:3000/periodos

$demoJson = Get-Content -Raw -Encoding UTF8 .\examples\submissao-ficticia.json
$demoBytes = [System.Text.Encoding]::UTF8.GetBytes($demoJson)
$demoKey = [guid]::NewGuid().ToString()
$demoResult = Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri http://127.0.0.1:3000/participacoes `
  -Headers @{ 'Idempotency-Key' = $demoKey } `
  -ContentType 'application/json; charset=utf-8' -Body $demoBytes
$demoResult.StatusCode
$demoResult.Content
```

Esperado: HTTP **201**, `status: ok`, `modo: demonstracao`. Esse retorno só ocorre após o COMMIT. Para testar um caso inválido, envie `-Body '{}'`: esperado **400** (o PowerShell apresenta erro HTTP). Para testar período encerrado, altere somente `periodo_id` para 3 no JSON: esperado **422**. JSON malformado dá **400**, tipo de conteúdo incorreto **415**, corpo acima de 16 KB **413**.

Encerre o primeiro terminal digitando **sair** e Enter, ou com **Ctrl+C**, para fechar as conexões e remover o schema de demonstração. Encerramento forçado do processo/computador pode deixar schemas temporários; nesse caso, inspecione e remova somente o schema fictício específico no banco de desenvolvimento. Nenhum cleanup remove `public`.

O servidor normal, `npm.cmd start`, mantém os endpoints GET de leitura e retorna **503** no POST. Nesta etapa, a antiga flag `ENABLE_DEMO_SUBMISSIONS` foi retirada da inicialização normal: somente `npm.cmd run demo` habilita escritas em um schema fictício isolado. A demonstração também recusa `NODE_ENV=production`. `HOST` tem padrão `127.0.0.1`; `PORT`, padrão 3000. Para iPhone use `HOST=0.0.0.0` no terminal e o IP LAN do computador na configuração do app. A conexão mantém as cinco variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` existentes. Nunca versionar seus valores.

## Contrato POST /participacoes

`Content-Type: application/json`, corpo limitado a 16 KB e cabeçalho obrigatório **`Idempotency-Key: <UUID v4>`**. O JSON original foi preservado; exemplo completo em `examples/submissao-ficticia.json`. Repetir a chave com o mesmo conteúdo retorna a mesma confirmação 201 sem inserir outra participação; outro conteúdo retorna 409. A migração `002_submission_idempotency.sql` é aplicada automaticamente apenas nos schemas temporários de teste/demonstração. Não foi aplicada em `public`.

```json
{
  "mega_setor_id": 1,
  "periodo_id": 1,
  "respostas": [
    { "questao_numero": 1, "alternativa": "Sempre" }
  ]
}
```

O trecho acima ilustra o formato; para aceitação são obrigatórias **31** entradas únicas, Q1 a Q31, em qualquer ordem. O exemplo completo versionado contém todas elas. IDs devem ser números inteiros positivos compatíveis com PostgreSQL `INT`. Não se aceitam coerção de tipos, campos extras ou alternativas fora do catálogo; não enviar nome, documento ou outro identificador pessoal.

| Questões | Alternativas exatas |
| --- | --- |
| Q1–Q16 | Sempre; Frequentemente; Às vezes; Raramente; Nunca |
| Q17–Q22 e Q24–Q27 | Sempre/Totalmente; Frequentemente/Parcialmente; Às vezes/Pouco; Raramente/Quase nada; Nunca/Nada |
| Q23 | Excelente; Muito boa; Boa; Regular; Ruim |
| Q28–Q31 | Sim; Não |

O período deve existir e atender `data_inicio <= CURRENT_TIMESTAMP < data_fim`, pelo relógio PostgreSQL no início da transação. O início é inclusivo e o fim exclusivo. Essa convenção técnica está coberta por teste de limites. Setor e período são consultados com parâmetros e bloqueio `FOR SHARE`, impedindo edição/remoção concorrente durante a gravação.

Na mesma conexão: `BEGIN` → validar setor/período → inserir participação → inserir as 31 respostas parametrizadas → `COMMIT`. Qualquer falha anterior à confirmação aciona rollback. Uma falha no rollback descarta a conexão. Respostas e detalhes de SQL/conexão não são registrados nem retornados. O sucesso não devolve ID ou respostas individuais; não existe endpoint de leitura individual.

| HTTP | Significado |
| --- | --- |
| 201 | Transação confirmada em modo de demonstração |
| 400 | JSON ou conteúdo inválido |
| 409 | Chave já usada com outro conteúdo |
| 413 | JSON excede 16 KB |
| 415 | Content-Type incompatível |
| 422 | Setor inexistente; período inexistente, futuro ou encerrado |
| 503 | Recebimento desabilitado |
| 500 | Falha de persistência; o cliente não deve mostrar confirmação |

## Histórico: resultados da primeira etapa em 18/10/2026

- App: 23 testes aprovados; lint e typecheck aprovados.
- API: 54 testes aprovados, incluindo subtestes de entradas inválidas, alternativas de todas as escalas, parametrização, coleta bloqueada, falhas de conexão/INSERT/COMMIT/rollback e confirmação somente após COMMIT.
- PostgreSQL real: 8 testes aprovados, incluindo o grupo de testes, gravação completa, GETs, vigência, rejeições, rollback após erro SQL nas respostas, rollback em falha real no COMMIT e demonstração com o JSON documentado.
- Banco original preservado; schemas temporários de teste/demonstração removidos no encerramento normal.
- Roteiro manual em PowerShell executado: JSON fictício completo → 201; JSON incompleto → 400; período encerrado → 422. Após encerrar a demonstração, consulta de metadados confirmou zero schemas temporários restantes.

## Histórico: arquivos da primeira etapa

| Arquivos | Alteração |
| --- | --- |
| `app.js` | Factory Express testável, quatro GETs preservados, POST e tratamento de erros. |
| `questionnaire.js` | Validação estrutural e das alternativas por questão, sem pontuação. |
| `submissions.js` | Validação referencial/temporal e gravação transacional. |
| `server.js`, `db.js`, `package.json` | Inicialização, configuração local sem exibir valores e comandos de execução/teste. |
| `tests/api.test.cjs`, `tests/helpers.cjs`, `tests/postgres.integration.cjs` | Testes HTTP, contrato e PostgreSQL real. |
| `testing/isolated-database.js`, `scripts/demo.js` | Schemas fictícios isolados e demonstração local. |
| `examples/submissao-ficticia.json` | Payload completo de 31 respostas fictícias, verificado por teste. |
| `README.md`, `../docs/auditoria-mvp-2026-10-18.md` | Contrato, testes, auditoria e plano de execução. |

Na primeira etapa, nenhuma dependência foi adicionada e nenhum arquivo do frontend ou do SQL original foi alterado. A integração posterior acrescentou expo-crypto e os arquivos listados no roteiro atualizado.

## Estado atual e limites

O app agora carrega setor/período, confirma e envia as respostas com idempotência aleatória por questionário. A chave e o snapshot são mantidos em memória em erros incertos. A participação continua podendo ser repetida por uma pessoa em outra sessão; não há identificação pessoal. Os testes, o roteiro atualizado e as limitações de validação física estão em [Integração app/API](../docs/integracao-api-demonstracao.md).

O frontend administrativo aguarda aprovação visual. O backend administrativo, a autenticação, a supressão e o IER estão descritos no roteiro de 21/10. O cálculo implementa a definição final fornecida pelo responsável, sob a versão `ier-mvp-2026-10-21-v1`. Q28–Q31 geram somente booleanos em grupos publicáveis e permanecem fora de escores.
