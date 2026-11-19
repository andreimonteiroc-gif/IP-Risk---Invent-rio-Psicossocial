# Auditoria e backend administrativo — 21/10/2026

> **Atualização de 30/10/2026:** o painel agora oferece gerenciamento de profissionais autorizados. `admin:setup` atribui o papel `gerenciador` à conta inicial e continua recusando sobrescrever configuração existente. Apenas um Gerenciador pode listar e cadastrar profissionais, por rotas autenticadas do backend. O arquivo local continua sendo a fonte única; hashes usam scrypt. Se a primeira conta da configuração legada estiver marcada como profissional autorizado, o backend a reconhece como Gerenciador em memória, sem editar o arquivo durante a inicialização. Consulte `web-admin/README.md` para a operação do painel.

> Histórico do backend antes da tela web. O contrato de resultados por setor operacional abaixo foi substituído pela consulta agregada por mega setor documentada em [Painel Web por mega setor](./painel-web-mega-setores.md); não use aqueles nomes de filtros como contrato atual.

## Estado auditado e preservação

- Repositório em `app-mobile/`; o diretório de trabalho acima dele não é um repositório Git.
- Branch `main`, alinhada à referência local `origin/main` (0 commits à frente/atrás, sem fetch nesta missão).
- Último commit: `5f35090`, `feat: estrutura inicial do backend com Express e PostgreSQL`, de 18/10/2026 às 21:57:56, UTC−03.
- Na entrada: **14 arquivos rastreados modificados e 18 arquivos não rastreados**. Incluíam integração mobile, idempotência, testes, scripts, documentação, dependências e lockfile. Essas alterações já existiam e foram preservadas. Tudo continua pendente de revisão/commit.
- Ao final: **15 arquivos rastreados modificados e 36 não rastreados**, incluindo o trabalho anterior. A lista dos arquivos desta missão consta abaixo; nenhuma alteração foi adicionada ao staging.
- Testes iniciais: 34 do aplicativo e 57 do backend aprovados.
- `.env` do backend já era ignorado; `.env` na raiz e outras variantes tinham cobertura incompleta. `.gitignore` agora cobre `.env`, `.env.*`, `.admin.local.json`, logs e dumps; permite `.env.example` sem valores reais.
- Nenhum arquivo de ambiente/credencial foi encontrado entre os arquivos rastreados nem no histórico local dos caminhos `.env` e de credenciais administrativas. Uma varredura de padrões de chaves privadas, tokens GitHub/AWS e URLs PostgreSQL com senha não encontrou ocorrências nos arquivos examinados. Isso não constitui auditoria de todo segredo possível ou de históricos remotos.
- O conteúdo de `backend/.env` não foi exibido nem alterado. Não foi criada conta administrativa real nem senha padrão.
- Nenhuma conexão ao banco principal foi usada nesta missão. A migração nova foi aplicada apenas no ambiente descartável. Nenhuma participação existente foi consultada, apagada ou sobrescrita. Não houve commit, push, deploy nem habilitação de coleta real.
- Nenhum arquivo do frontend foi editado nesta missão. Layout, gráficos e identidade visual aguardam definição.

## Autenticação e operação

`admin:setup` cria `backend/.admin.local.json` com usuário, papel explícito `profissional_autorizado` e hash scrypt com salt aleatório. Parâmetros: N=131072, r=8, p=1, chave de 64 bytes, memória máxima de 256 MiB. A implementação usa `node:crypto`, sem novas dependências, conforme a [API Node.js](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) e as [orientações de armazenamento de senhas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

A senha tem 15–128 caracteres e é digitada sem eco. O script recusa a senha do PostgreSQL e usa escrita exclusiva: configuração preexistente permanece intacta. O servidor também verifica a separação de senhas ao carregar as contas. O arquivo deve permanecer acessível apenas aos operadores autorizados; em Windows, a proteção efetiva depende das ACLs do diretório (o modo POSIX `0600` não substitui ACLs). Somente o responsável pelo sistema pode cadastrar profissionais autorizados. Não há cadastro público ou atribuição de papel pelo cliente. Para contas adicionais, o responsável pode configurar a lista `contas` localmente com hashes gerados pelo módulo de autenticação; nenhuma rota HTTP administra credenciais.

Login devolve token opaco aleatório de 256 bits. Somente o hash do token fica na memória do processo. Expiração absoluta de 30 minutos e logout revogam o acesso. Reiniciar o servidor revoga todas as sessões. Limites: cinco tentativas por IP/usuário em 15 minutos, 30 globais na mesma janela, duas verificações de senha simultâneas e até 100 sessões. Tentativas bem sucedidas também contam. Respostas inválidas são genéricas e não distinguem usuário inexistente de senha errada. O MVP usa **um processo**; várias réplicas exigiriam armazenamento compartilhado de sessões e limites antes da implantação.

Todas as rotas `/admin/*`, exceto o login, exigem `Authorization: Bearer <token>`. Sem configuração local, retornam 503. Não há cookies ou credenciais no frontend. O backend não registra corpos, tokens ou respostas individuais. Rotas administrativas rejeitam `Origin`, inclusive localhost, pois nenhum frontend administrativo foi aprovado. HTTP é aceito somente de socket loopback; acessos remotos exigem HTTPS. Não há confiança em `X-Forwarded-*`. Eventual proxy deve publicar exclusivamente HTTPS e encaminhar para loopback; essa infraestrutura não foi implantada.

## Contrato administrativo

| Método e rota | Comportamento |
| --- | --- |
| `POST /admin/login` | JSON com somente `usuario` e `senha`; retorna token e duração. |
| `POST /admin/logout` | Revoga a sessão atual; 204. |
| `GET /admin/calculo` | Versão das regras, referência, fórmulas e sete dimensões; exige sessão. |
| `GET /admin/resultados?setor_id=2&periodo_id=3` | Uma célula congelada de setor exato × período encerrado; exige sessão. |

Resultado liberado:

```json
{
  "status": "disponivel",
  "participacoes_validas": 5,
  "alertas": { "Q28": true, "Q29": true, "Q30": true, "Q31": true },
  "ier": {
    "disponivel": true,
    "versao_regras": "ier-mvp-2026-10-21-v1",
    "global": { "valor": 40.74074074074074, "valor_arredondado": 40.7, "cor": "amarelo" },
    "dimensoes": [
      { "codigo": "exigencias_trabalho", "nome": "Exigências do Trabalho", "valor": 100, "valor_arredondado": 100, "cor": "vermelho" },
      { "codigo": "organizacao_conteudo", "nome": "Organização e Conteúdo do Trabalho", "valor": 0, "valor_arredondado": 0, "cor": "verde" },
      { "codigo": "relacoes_lideranca", "nome": "Relações Sociais e Liderança", "valor": 12.5, "valor_arredondado": 12.5, "cor": "verde" },
      { "codigo": "interface_trabalho_familia", "nome": "Interface Trabalho-Família", "valor": 100, "valor_arredondado": 100, "cor": "vermelho" },
      { "codigo": "valores_organizacionais", "nome": "Valores Organizacionais", "valor": 0, "valor_arredondado": 0, "cor": "verde" },
      { "codigo": "seguranca_ocupacional", "nome": "Segurança Ocupacional", "valor": 100, "valor_arredondado": 100, "cor": "vermelho" },
      { "codigo": "saude_bem_estar_desfechos", "nome": "Saúde, Bem-estar e Desfechos", "valor": 60, "valor_arredondado": 60, "cor": "amarelo" }
    ]
  }
}
```

Para grupo com menos de cinco participações válidas, inexistente, vazio ou não publicado, a resposta é sempre HTTP 200 com **somente**:

```json
{ "status": "protegido_ou_indisponivel" }
```

Não retorna contagem, alerta ou cálculo nesse caso. Erros de filtro retornam 400; ausência de sessão, 401; origem/transporte recusados, 403; rota individual/inexistente autenticada, 404; excesso de tentativas, 429. Todas as respostas administrativas usam `Cache-Control: no-store`.

Não existem rotas de participantes, respostas, busca por chave, exportações, totais gerais ou resultados por macroárea. IDs de setor/período são metadados de coleta; IDs, chaves e hashes de participações nunca são devolvidos. Uma lista explícita de campos impede repasse acidental de dados extras armazenados no JSON da publicação.

## Validade, limiar e prevenção de diferenças

Participação tecnicamente válida para a publicação exige exatamente 31 questões únicas, alternativas pertencentes à respectiva questão e envio dentro da vigência `[início, fim)` do período associado. São verificadas também linhas legadas sem chave de envio. Alternativas como “Prefiro não responder” são rejeitadas. Incompletas, alternativas arbitrárias e timestamps fora da vigência não contam. Isso não comprova consentimento ético, elegibilidade ou unicidade de pessoa; o esquema atual ainda não registra essas comprovações. Idempotência resolve repetição técnica de requisição, sem identificar participantes.

Apenas verificar `n >= 5` em consultas livres permitiria comparar totais sobrepostos ou resultados antes/depois de uma participação. Por isso, a política do MVP é:

1. Publicação **local e explícita**, somente após o encerramento do período. Não existe endpoint HTTP de publicação.
2. Uma única publicação persistida por período, com células por **setor exato**, sem somar descendentes.
3. Períodos publicados não podem se sobrepor. Intervalos adjacentes são permitidos. Não há filtro por datas livres, exclusões, múltiplos setores/períodos ou totais.
4. A publicação é transacional; o publicador bloqueia escritas nas tabelas de origem enquanto fixa os agregados. O SQL só transfere agregados para a publicação e não entrega respostas individuais ao JavaScript.
5. Células menores que cinco não armazenam sequer a contagem ou os alertas na tabela de resultados.
6. As rotas leem exclusivamente os resultados congelados. Inserções/correções posteriores não produzem nova versão. Triggers rejeitam atualização/exclusão e inserção tardia de células; uma chave única impede republicar o período. Há serialização de publicações concorrentes.

Não recrie publicações para atualizar números, nem apague as tabelas para contornar essa proteção. Correções de publicações já expostas exigem nova análise de privacidade. Um período não deve ser publicado antes da conferência final dos dados. A política protege contra diferenças oferecidas pela própria API; não é garantia de anonimato contra qualquer conhecimento externo nem contra administradores com poder de modificar o banco e desabilitar proteções.

`Q28`–`Q31`: cada booleano é `true` se existir qualquer “Sim” entre as participações válidas daquela célula. Não há contagens ou percentuais por item. Em grupos protegidos, nenhum desses campos aparece. Q28–Q31 nunca entram no IER.

## Setores e cálculo

`003_admin_privacy_and_sectors.sql` cria `macroareas` e acrescenta `setores.macroarea_id` opcional, com FK e exclusão restrita. Macroáreas agrupam setores/subdivisões preservando IDs, nomes, FKs e participações antigas, sem reatribuição por aproximação de nomes. **Atualização posterior:** a migração `005_participation_mega_sector.sql` permite ao app selecionar um dos oito mega-setores diretamente. As novas linhas guardam `macroarea_id` e deixam `setor_id` nulo; a publicação resolve ambos os formatos legados e novos para o mesmo agrupamento.

Após a solicitação inicial, o responsável forneceu as oito macroáreas e 33 subdivisões. A transcrição está em `backend/sector-catalog.json`, versão `setores-fornecidos-2026-10-21-v1`; distribuição 5/6/5/5/4/4/2/2. Os nomes foram mantidos literalmente, inclusive “Administrativo e Gestão Corporal”. O título “Tabela Oficial ... MTE / eSocial” foi atribuído pelo usuário: não foi apresentada fonte institucional que permita certificar essa origem. Não se trata de validação normativa feita nesta missão.

`sector-catalog.js` valida cardinalidade, unicidade e tamanho dos nomes. O importador é transacional e repetível: reutiliza nomes exatamente iguais sem trocar IDs; pode vincular um setor ainda sem macroárea, mas recusa reatribuir setor já vinculado a outra macroárea. Não renomeia/apaga setores ou participações. O nome de setor continua globalmente único, como no esquema original; o catálogo recebido não possui duplicidades. A importação foi executada somente em testes isolados. Para futura execução explícita, `npm.cmd run admin:catalog` exige `CATALOG_DATABASE_URL` e a migração 003; não há fallback para a conexão principal. O mapeamento dos nomes legados diferentes dos fornecidos segue pendente, sem automatismo.

O cálculo implementa a **definição final fornecida pelo responsável nesta conversa**, sob `ier-mvp-2026-10-21-v1`, em `scoring-rules.json`. A referência prioritária declarada é o questionário original de Wellington Moreira da Silva, Anexo II, páginas 23–24; a documentação técnica reformulada foi citada pelo responsável para o semáforo. Os documentos originais não foram anexados ou lidos nesta missão: a autorização metodológica utilizada é a especificação explícita recebida. Cada publicação persiste a versão e uma cópia integral dessas regras, permitindo revisão futura. Mudança metodológica exige nova versão e avaliação das publicações anteriores; uma versão desconhecida é devolvida como cálculo indisponível, sem pontuar silenciosamente sob outra definição.

- Diretas: Q1, Q2, Q3, Q4, Q12, Q17, Q21, Q22, Q24, Q25 e Q26.
- Inversas: Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q13, Q14, Q15, Q16, Q18, Q19, Q20, Q23 e Q27.
- Cinco alternativas na ordem atual: 100, 75, 50, 25, 0; inversas usam `100 − valor inicial`. Q23 resulta em Excelente=0, Muito boa=25, Boa=50, Regular=75, Ruim=100.
- Sete dimensões: Q1–Q4; Q5–Q8; Q9–Q16; Q17; Q18–Q20; Q21–Q22; Q23–Q27. A inicialização valida automaticamente cobertura exata de Q1–Q27, sem ausências ou repetições.
- IER individual interno = média simples de 27 valores ajustados. Por dimensão, média simples dos respectivos itens. O resultado coletivo SQL é a média dos IER individuais válidos, global e por dimensão, sem arredondamento intermediário. Não usa a média das sete dimensões como IER global. Nenhum resultado individual sai pela API.
- Semáforo aplicado após arredondar uma casa decimal, metade para cima: verde 0,0–33,3; amarelo 33,4–66,6; vermelho 66,7–100,0. O valor não arredondado é preservado em `valor`; a apresentação usa `valor_arredondado` e `cor`. Os testes verificam também 33,35→33,4 e 66,65→66,7 e a cobertura de todo o intervalo, sem lacunas.

As respostas originais permanecem intactas. Q28–Q31 ficam fora do mapa de pontuação. No frontend existente, Q17–Q20 continuam juntas em um bloco de revisão: o backend usa as duas dimensões científicas distintas solicitadas. Essa divergência de agrupamento foi registrada sem modificar telas. Os metadados de polaridade atuais coincidem com a definição recebida; não foi necessário corrigi-los.

## Demonstração reproduzível sem banco principal

Em `app-mobile/backend`, com Node.js e binários PostgreSQL instalados:

```powershell
npm.cmd run admin:setup -- profissional.local
npm.cmd run demo:admin
```

A senha é solicitada interativamente; não coloque senhas em argumentos ou em `EXPO_PUBLIC_*`. O setup lê apenas a configuração local para evitar reutilização da senha PostgreSQL; não abre conexão. Nenhuma conta real foi criada automaticamente nesta entrega.

O runner usa, por padrão no Windows, `C:\Program Files\PostgreSQL\18\bin`. Para outro caminho, configure `$env:PG_BIN`. Ele cria um cluster PostgreSQL temporário independente, com porta aleatória em loopback e autenticação trust restrita a essa instância descartável, aplica `001`, `002`, `003` e `004`, nessa ordem, e inicia a API em `127.0.0.1:3000`. Não carrega a conexão principal. Se necessário, configure `$env:PORT` para outra porta. A demonstração administrativa recusa produção.

Fixtures do **período 3 encerrado/publicado**: setor 1 com quatro participações (protegido), setor 2 com cinco (alertas verdadeiros) e setor 3 com seis (alertas falsos). Os nomes desses setores são explicitamente fictícios e não compõem o catálogo oficial. O período 1 permanece vigente para testar submissões fictícias mobile; seus resultados não ficam disponíveis durante a coleta.

Em um segundo terminal PowerShell:

```powershell
$base = 'http://127.0.0.1:3000'
$segredo = Read-Host 'Senha administrativa' -AsSecureString
$senhaTexto = [System.Net.NetworkCredential]::new('', $segredo).Password
try {
    $corpo = @{ usuario = 'profissional.local'; senha = $senhaTexto } | ConvertTo-Json
    $sessao = Invoke-RestMethod -Method Post -Uri "$base/admin/login" -ContentType 'application/json' -Body $corpo
} finally {
    Remove-Variable senhaTexto,corpo,segredo -ErrorAction SilentlyContinue
}
$cabecalhos = @{ Authorization = "Bearer $($sessao.token)" }
Invoke-RestMethod "$base/admin/resultados?setor_id=1&periodo_id=3" -Headers $cabecalhos
Invoke-RestMethod "$base/admin/resultados?setor_id=2&periodo_id=3" -Headers $cabecalhos
Invoke-RestMethod "$base/admin/resultados?setor_id=3&periodo_id=3" -Headers $cabecalhos
Invoke-RestMethod "$base/admin/calculo" -Headers $cabecalhos
Invoke-RestMethod -Method Post "$base/admin/logout" -Headers $cabecalhos
Remove-Variable sessao,cabecalhos
```

Para conferir negativas, tente login com senha fictícia incorreta (401), consulta sem cabeçalho (401), filtro `setor_id=1,2` (400), consulta autenticada a `/admin/respostas` (404), e repita a consulta depois do logout (401). O PowerShell mostra exceção HTTP nesses casos. Não imprima o token ou o corpo de login. Evite mais de cinco logins no intervalo de 15 minutos.

Digite `sair` no terminal da demonstração para encerrar e remover schema/cluster temporários. Ctrl+C também é tratado. Encerrar à força o processo ou o sistema pode deixar arquivos temporários; não remova diretórios de outras sessões.

No servidor normal, `npm.cmd start` mantém a coleta desabilitada. Para usar resultados em um ambiente futuro, o operador precisará aplicar a migração aditiva 003 no schema correto e configurar contas e privilégios. **Isso não foi realizado no banco principal.** Recomenda-se separar o papel publicador do papel HTTP, concedendo somente SELECT nas tabelas `admin_publicacoes` e `admin_grupos_publicados` ao serviço, sem privilégios de alteração nessas tabelas. Não use superusuário no serviço. O serviço mobile pode manter seus privilégios mínimos próprios de persistência.

O comando local `npm.cmd run admin:publish -- <periodo_id>` exige `ADMIN_PUBLICATION_DATABASE_URL` explícita e não usa fallback para `.env`; não aplica migrações. Esta operação persiste a publicação uma vez e precisa ser direcionada pelo operador ao ambiente autorizado. Use apenas a demonstração isolada nesta fase.

## Verificações e arquivos

Comandos:

```powershell
# Em app-mobile
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
# Em app-mobile/backend
npm.cmd test
npm.cmd run test:isolated
```

Resultados: **34 testes do app, 79 do backend e 30 de integração PostgreSQL aprovados**, sem falhas ou testes ignorados; lint, typecheck e `git diff --check` aprovados. As contagens do runner Node incluem os testes agrupadores. A integração cobre mobile com runtime nativo simulado → HTTP → PostgreSQL, reenvios e rollback; também confere o cálculo coletivo SQL com participações heterogêneas, regras versionadas e importação repetida do catálogo com preservação dos dados legados. Os testes de cálculo cobrem as 27 polaridades, Q12, escala própria de Q23, sete dimensões, extremos 0/100, pesos iguais, exclusão de Q28–Q31 e fronteiras do semáforo. Não substitui novo teste manual em iPhone; o teste físico anterior foi informado pelo usuário.

O sandbox Windows inicialmente impediu o PostgreSQL de iniciar por restrição de token. A execução fora do sandbox foi aprovada para o cluster descartável. O primeiro teste real detectou uma asserção que dependia da ordem de um SELECT sem ORDER BY; a asserção foi corrigida para localizar o ID sem pressupor ordem. A execução final passou e o cluster foi parado e removido.

Arquivos desta missão:

| Arquivos | Alteração |
| --- | --- |
| `.gitignore` | Proteção mais ampla de configurações e artefatos locais. |
| `backend/admin-auth.js`, `admin-config.js`, `admin.js` | Credenciais locais, hash, sessões, limites e rotas protegidas. |
| `backend/admin-publication.js` | Validade, supressão SQL e publicação transacional congelada. |
| `backend/scoring.js`, `scoring-rules.json` | Regras recebidas, versão, aritmética sem pesos, sete dimensões e semáforo. |
| `backend/sector-catalog.js`, `sector-catalog.json` | Catálogo recebido e importação preservando IDs e participações. |
| `backend/sql/003_admin_privacy_and_sectors.sql` | Hierarquia e resultados imutáveis; aplicada somente nos testes. |
| `backend/app.js`, `server.js` | Montagem das rotas e carregamento seguro da configuração. |
| `backend/questionnaire.js` | Exportação das alternativas e validador de ID para reutilização, sem mudar alternativas. |
| `backend/scripts/setup-admin.js`, `publish-admin.js`, `demo-admin.js`, `import-sectors.js` | Configuração, publicação local, catálogo e demonstração fictícia. |
| `backend/testing/run-isolated.cjs`, `isolated-database.js` | Cluster separado e remoção do fallback para banco principal. |
| `backend/tests/admin.test.cjs`, `admin.integration.cjs`, `scoring.test.cjs` | Testes de autenticação, privacidade, cálculo, catálogo, congelamento e compatibilidade. |
| `backend/package.json`, `scripts/demo.js`, `README.md` | Comandos, mensagem e documentação atuais. |
| `docs/integracao-api-demonstracao.md`, este documento | Atualização operacional e auditoria. |

`backend/app.js`, `questionnaire.js`, `scripts/demo.js`, `testing/isolated-database.js`, README e o documento de integração já eram arquivos não rastreados na entrada; receberam alterações pontuais desta missão. Demais mudanças preexistentes, inclusive frontend, `db.js` e lockfiles, foram preservadas.

## Pendências e próximos passos

1. Conferir a grafia fornecida “Gestão Corporal” e anexar a fonte institucional se o catálogo precisar ser apresentado como oficial. Mapear explicitamente setores legados com nomes diferentes antes de importar em ambiente permanente. Confirmar a regra de mesclagem com o professor; nenhuma mesclagem está implementada.
2. Anexar os documentos científicos citados para rastreabilidade documental; as regras finais fornecidas já estão implementadas e versionadas. Revisões metodológicas futuras devem preservar o histórico das publicações e receber versão própria.
3. Definir e aprovar layout, telas, gráficos e identidade visual antes de criar o frontend administrativo.
4. Validar TCLE, elegibilidade, instrumento, versionamento, tratamento de duplicidades e autorizações científicas/éticas antes de qualquer coleta real.
5. Após aprovações, preparar ambiente de demonstração/implantação, papéis PostgreSQL mínimos, HTTPS e credenciais pessoais. Conferir backup e o destino antes de aplicar qualquer migração no banco principal.
6. Integrar o frontend administrativo aprovado às quatro rotas, executar teste manual de ponta a ponta e preparar o roteiro de apresentação. Revisar todo o diff, incluindo as alterações preexistentes, antes de solicitar autorização para commit/push.
