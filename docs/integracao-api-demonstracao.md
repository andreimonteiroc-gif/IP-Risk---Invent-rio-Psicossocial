# Integração P0 do app com a API — 18/10/2026

**Atualização operacional de 21/10/2026:** os helpers de teste/demonstração não carregam mais a conexão principal. `npm.cmd run demo` exige `TEST_DATABASE_URL` explícita de um banco local separado `inventario_test_*`. Para ambiente automático independente e backend administrativo, siga [o roteiro atual](backend-administrativo-2026-10-21.md): `admin:setup` e `demo:admin`. As referências abaixo à conexão já configurada são históricas e foram substituídas por essa proteção.

## Entrega

O app usa o contrato JSON de `POST /participacoes`, com `mega_setor_id`, `periodo_id` e as 31 respostas. Busca `/health`, `/mega-setores` e `/periodos`, aceita somente backend em demonstração e exige exatamente um período marcado `vigente` pelo PostgreSQL. A tela exibe os oito mega-setores lidos da tabela `macroareas` e guarda o ID selecionado e o período no contexto que acompanha as respostas. Carregamento, erro, catálogo diferente de oito itens e múltiplos períodos vigentes bloqueiam o avanço e oferecem nova tentativa.

`Q1`–`Q31` são convertidos explicitamente em `questao_numero` 1–31. Na revisão, Continuar para confirmação abre a confirmação final; Enviar dispara o POST. Indicadores e trava síncrona protegem contra duplo clique. Somente HTTP 201 com `status: ok`, `modo: demonstracao` e mensagem válida mostra sucesso. Falhas preservam as respostas. A indicação provisória de privacidade no TCLE foi ajustada para explicar a gravação fictícia; não foi criado um termo ético definitivo.

Textos, alternativas, dimensões e polaridades das 31 questões foram preservados. Não há cálculo de pontuação, classificação de risco ou painel nesta entrega.

## Idempotência sem identificação pessoal

- O JSON original não recebeu novos campos. O cabeçalho **Idempotency-Key** é obrigatório e contém UUID v4 gerado por `expo-crypto` somente na primeira tentativa daquele questionário. Não usa dados pessoais, dispositivo, conta ou identificador de instalação.
- O app mantém chave e snapshot em memória. Em timeout, rede indisponível, HTTP 500 ou confirmação inválida, bloqueia correções e reenvia o mesmo conteúdo e chave. Navegar entre telas não cria outra chave. Fechar uma tentativa incerta requer confirmação explícita na interface.
- HTTP 400/422/503 com código reconhecido de rejeição anterior à gravação permite corrigir a seleção/respostas. Uma tentativa posterior pode receber nova chave porque a anterior não foi consumida. HTTP 409 não gera chave nova automaticamente.
- A migração `002_submission_idempotency.sql` acrescenta chave única e hash do conteúdo à participação. O hash incorpora a chave aleatória como salt, evitando fingerprint igual entre questionários distintos com respostas iguais. Linhas legadas podem continuar sem chave; novas escritas da API exigem a chave.
- A chave é gravada atomicamente com participação e respostas. A restrição UNIQUE trata requisições concorrentes; a comparação usa conteúdo em ordem canônica. Repetições idênticas retornam 201 sem novas linhas. Conteúdo diferente com a mesma chave retorna 409. Um rollback não consome a chave. A confirmação de uma gravação anterior continua disponível depois de o período encerrar.
- A proteção vale enquanto a chave e a participação forem preservadas. Fechar/recarregar o app, perder o processo ou descartar explicitamente a tentativa perde o estado em memória. A pessoa pode iniciar outro questionário em outra sessão. Isso não é prevenção de uma segunda participação por pessoa e não permite afirmar unicidade de participantes.
- Não foi criada leitura pública por chave, nem endpoint que devolva respostas individuais. O corpo, a chave e o hash não são registrados em logs.

Implementação de UUID conforme a [documentação Expo Crypto SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/). A unicidade concorrente usa o comportamento de [INSERT ON CONFLICT do PostgreSQL](https://www.postgresql.org/docs/current/sql-insert.html).

## Iniciar backend de demonstração

Terminal 1, na raiz do repositório `app-mobile`:

```powershell
cd backend
$env:HOST = '0.0.0.0'
npm.cmd run demo
```

Para testar apenas no computador, omita HOST e mantenha o padrão `127.0.0.1`. O comando exige `TEST_DATABASE_URL` de uma instância local descartável separada, cria um schema aleatório `inventario_demo_<sufixo>`, aplica 001–004 em ordem e cadastra apenas setor/períodos fictícios. Não acessa o banco principal nem carrega `.env`. O usuário do banco de teste precisa de permissão CREATE SCHEMA. A porta padrão é 3000, configurável por PORT. `demo:admin` prepara automaticamente um cluster independente, com acesso administrativo somente local.

O terminal informa o **nome exato do schema**, necessário para o pgAdmin. Mantenha esse processo ativo durante a inspeção. Para encerrar e remover o schema fictício, digite `sair` e Enter ou use Ctrl+C. Encerramento forçado pode deixar o schema; não remova schemas de outras sessões sem conferir sua origem.

O servidor normal (`npm.cmd start` dentro de backend) permanece com o POST bloqueado e ignora a antiga flag de habilitação de demonstração. O script demo recusa produção. Nenhuma migração foi executada sobre as tabelas existentes de `public` nesta etapa.

## Iniciar app no navegador

Terminal 2, em `app-mobile`:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000'
npm.cmd run web -- --port 8081
```

Abra `http://localhost:8081`. As origens web permitidas por padrão são exatamente `http://localhost:8081` e `http://127.0.0.1:8081`. O preflight permite Content-Type e Idempotency-Key, sem cookies/credenciais. Não há CORS curinga. Para outra origem/porta, configure explicitamente `DEMO_WEB_ORIGINS` como lista separada por vírgulas no terminal do backend e reinicie a demonstração.

O navegador deve usar localhost ou HTTPS para a geração criptográfica de UUID; não use a versão web via HTTP em um IP LAN como substituto do teste em Expo Go. Depois de alterar a URL da API, recarregue integralmente o app; antes de tentar enviar, isso inicia uma sessão vazia.

Somente a URL pública é exposta ao bundle. Nenhuma credencial de banco ou administração pertence a EXPO_PUBLIC. Esse mecanismo de configuração segue a [documentação de variáveis do Expo](https://docs.expo.dev/guides/environment-variables/).

## Iniciar no iPhone físico

1. Conecte computador e iPhone à mesma rede Wi-Fi. Use `ipconfig` para identificar o IPv4 do adaptador conectado à rede; evite IP de VPN/adaptador virtual. Exemplo ilustrativo abaixo: `192.168.1.50`; substitua pelo IP real do computador.
2. Inicie o backend com HOST `0.0.0.0`, como acima. No Safari do iPhone abra `http://192.168.1.50:3000/health`. Deve retornar modo `demonstracao` e recebimento habilitado. Se não abrir, resolva rede/firewall antes de testar o app. Não houve alteração automática do firewall.
3. Em outro terminal, em `app-mobile`:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.50:3000'
npm.cmd start -- --lan --port 8081
```

4. Abra o projeto pelo QR code no Expo Go compatível com SDK 57. A documentação atual informa que Expo CLI e Expo Go no iPhone devem estar na mesma conta Expo. Se necessário, execute `npx.cmd expo login` no computador e autentique-se normalmente no Expo Go; nenhuma senha é incorporada ao app. Permita o acesso à rede local no iPhone quando solicitado. Consulte o [roteiro oficial de desenvolvimento Expo](https://docs.expo.dev/get-started/start-developing/).
5. Complete elegibilidade de demonstração, leia o aviso do TCLE provisório, escolha um dos oito mega-setores retornados pela API, responda às 31 questões com valores inventados e revise. Toque Continuar para confirmação e Enviar. Deve aparecer confirmação somente depois da API.
6. Toque Enviar rapidamente duas vezes no primeiro envio: deve existir uma única participação. Para simular falha de rede no aparelho, antes de enviar desative o Wi-Fi/dados de modo que a API LAN fique inacessível; aguarde o erro, reative e use Tentar novamente sem fechar/recarregar o app. As respostas devem continuar presentes. A perda HTTP depois do COMMIT foi simulada de forma determinística nos testes automatizados.

`localhost` no iPhone aponta para o próprio iPhone, portanto não é usado nesse roteiro. Um túnel do Metro não publica automaticamente a API Express. Se a rede impedir conexões entre dispositivos, será necessário ajustar o ambiente ou disponibilizar uma URL HTTPS de demonstração separadamente; isso não foi publicado nesta entrega.

## Conferir no pgAdmin (somente schema fictício)

Mantenha a demonstração ativa. No banco já configurado, abra Query Tool e substitua **o nome inteiro** do schema abaixo pelo nome impresso no terminal:

```sql
SET search_path TO "inventario_demo_SUBSTITUA_PELO_SUFIXO_DO_TERMINAL";

SELECT COUNT(*) AS participacoes FROM participacoes;
SELECT COUNT(*) AS respostas FROM respostas;

SELECT p.id, p.setor_id, p.macroarea_id, p.periodo_id, COUNT(r.questao_numero) AS total_respostas
FROM participacoes p
LEFT JOIN respostas r ON r.participacao_id = p.id
GROUP BY p.id, p.setor_id, p.macroarea_id, p.periodo_id
ORDER BY p.id;
```

Após um envio novo: uma participação, 31 respostas e total_respostas 31 na linha fictícia; `setor_id` fica nulo e `macroarea_id` contém o mega-setor escolhido. Repetir a mesma tentativa não altera esses totais. Não é necessário abrir o conteúdo das respostas individuais para essa verificação. O schema desaparece ao encerrar normalmente a demonstração.

## Testes e alcance da comprovação

```powershell
# Em app-mobile
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck

# Em app-mobile/backend
npm.cmd test
npm.cmd run test:integration
```

Resultados desta etapa: **34 testes do app, 57 testes HTTP/contrato e 15 testes de integração PostgreSQL aprovados**, incluindo subtestes e seus grupos. Lint e typecheck aprovados. Os testes integrados executam o Provider, conversão, telas/callbacks reais e cliente HTTP do aplicativo contra Express e PostgreSQL reais; somente runtime de hooks, primitivas nativas, roteador e geração nativa de UUID são substituídos (UUID usa a implementação criptográfica do Node no teste).

| Exigência | Comprovação automatizada |
| --- | --- |
| Envio válido e persistência de 31 respostas | Fluxo das 31 questões com HTTP real; comparação das alternativas/questões com linhas salvas no PostgreSQL |
| Incompleto | Cliente não envia; API também rejeita 30 respostas sem abrir transação |
| Setor inválido e período encerrado | HTTP 422, nenhum registro adicional, respostas preservadas e seleção liberada para correção |
| Falha de rede e timeout | Sem sucesso, estado preservado, snapshot/chave mantidos |
| Erro do servidor | HTTP 500, JSON inválido e falso sucesso nunca confirmam envio |
| Duplo clique | Trava síncrona no Provider e uma participação real com 31 respostas |
| HTTP perdido após COMMIT | Resposta descartada no transporte de teste; app mostra erro, banco contém o envio; repetir confirma sem duplicar, inclusive após encerrar o período |
| Concorrência e payload conflitante | Cinco requisições simultâneas com mesma chave geram uma participação; conteúdo diferente com a mesma chave retorna 409 |
| Rollback e chave | Falha SQL desfaz participação/respostas; mesma chave continua utilizável na tentativa corrigida |
| Privacidade da chave | Novos questionários têm UUIDs e fingerprints distintos, mesmo com respostas iguais |
| Navegação | Testes anteriores de correção, retorno, encerramento e proteção contra toque duplicado permanecem aprovados |

O bundle web foi exportado com sucesso. O bundle iOS JavaScript foi exportado com `--no-bytecode`; a execução de hermesc.exe para gerar bytecode foi bloqueada por permissão do ambiente. Nenhuma configuração de engine do projeto foi alterada. As exportações estão em `.expo/demo-web` e `.expo/demo-ios`, ignoradas pelo Git.

Não havia navegador conectado à ferramenta de automação e não havia iPhone acessível nesta sessão. **Teste visual em navegador e execução no aparelho físico permanecem pendentes**; os resultados acima não são uma declaração de E2E no iPhone ou de build nativo assinado.

## Limitações e pendências

- Somente dados fictícios. A aplicação não consegue determinar se uma resposta digitada é inventada: a restrição é operacional, reforçada por avisos e isolamento do banco. Coleta real continua bloqueada e depende das definições éticas/científicas.
- Estado em memória, sem recuperação após encerramento/reload; não há modo offline persistente. Preserve a sessão ao testar reenvio.
- Uma pessoa pode responder novamente em outra sessão, sem ligação entre as chaves. Não se adicionou identificação pessoal para impedir isso.
- É obrigatório existir exatamente um período vigente de demonstração; múltiplos vigentes exigem ajuste de configuração, em vez de escolha silenciosa.
- Expo Go/aparelho, permissões de rede local e conectividade LAN ainda precisam da execução manual descrita acima. O bytecode Hermes de produção também não foi verificado neste ambiente.
- O instalador informou 28 vulnerabilidades no conjunto de dependências (10 moderadas, 18 altas). Esta etapa acrescentou somente expo-crypto compatível com SDK 57, sem atualização ampla ou execução de `npm audit fix --force`; a avaliação das dependências permanece pendente.
- Painel, autenticação administrativa, agregações, regra de supressão de grupos e validação científica de escores permanecem fora desta etapa. Não há divulgação de resultados nem endpoints de respostas individuais.

## Arquivos alterados ou criados nesta etapa

Não inclui arquivos já alterados exclusivamente pela primeira etapa e que não foram tocados nesta integração.

```text
backend/README.md
backend/app.js
backend/package.json
backend/scripts/demo.js
backend/server.js
backend/sql/002_submission_idempotency.sql
backend/submissions.js
backend/testing/isolated-database.js
backend/tests/api.test.cjs
backend/tests/helpers.cjs
backend/tests/idempotency.test.cjs
backend/tests/mobile.integration.cjs
backend/tests/postgres.integration.cjs
docs/integracao-api-demonstracao.md
package.json
package-lock.json
src/components/ReviewBlock.js
src/data/submission.js
src/screens/ConsentScreen.js
src/screens/QuestionnaireGuidanceScreen.js
src/screens/QuestionnaireScreen.js
src/screens/ReviewScreen.js
src/screens/SectorScreen.js
src/services/api.js
src/state/QuestionnaireContext.js
tests/helpers.cjs
tests/review.test.cjs
tests/submission.test.cjs
```

Nenhum `.env`, segredo ou credencial foi incluído nos arquivos alterados. Não houve commit nem push.
