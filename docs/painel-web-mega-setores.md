# Painel Web por mega setor

Atualização posterior à auditoria do backend de 21/10/2026. Este documento registra a implementação do painel e substitui, para o comportamento atual, as referências anteriores a resultados separados por setor operacional.

## Aplicação Web

`web-admin/` é uma aplicação Next.js baseada no ZIP local do template administrativo do professor. Mantém a moldura visual do template — menu lateral, cabeçalho, cards arredondados, fundos claros e azul principal — e aplica as capturas fornecidas como referência para login, dashboard, modais e hierarquia visual. O escopo entregue contém login e consulta de resultados agregados; não inclui as telas genéricas de cadastro/edição de usuários do template.

O dashboard obtém as opções de mega setores, períodos publicados e resultados da API. Não possui resultados simulados. Informa carregamento, falhas, sessão expirada, ausência de publicação, grupo protegido e cálculo indisponível.

## Sessão e integração

O navegador chama somente rotas locais do Next.js. As rotas servidoras encaminham os pedidos para `ADMIN_API_BASE_URL` (padrão local `http://127.0.0.1:3000`) sem encaminhar cabeçalho `Origin`; o backend mantém o bloqueio a origens de navegador diretas. O token Bearer fica num cookie `HttpOnly`, `SameSite=Strict`, com expiração igual ou inferior aos 30 minutos da sessão do backend. O cliente não guarda token em Web Storage. Em produção, o cookie usa `Secure`.

Rotas privadas do backend:

| Rota | Conteúdo |
| --- | --- |
| `GET /admin/mega-setores` | IDs e nomes dos oito mega setores. |
| `GET /admin/periodos` | Metadados somente dos períodos publicados sob a nova política. |
| `GET /admin/resultados?mega_setor_id=N&periodo_id=N` | Uma célula agregada publicada; não aceita setor operacional, múltiplos valores, intervalos livres ou totais. |

`GET /admin/calculo` e `POST /admin/logout` mantêm os contratos existentes. Consultas antigas por `setor_id` são rejeitadas. Não há endpoint de publicação HTTP nem endpoint de respostas individuais.

## Publicação e migração

A migração aditiva `backend/sql/004_admin_mega_sectors.sql` cria snapshots imutáveis por mega setor e período, permite a política versionada `mega_setor_periodo_fechado_v1` e não remove nem reescreve registros antigos. A cadeia completa deve ser aplicada em ordem `001` → `002` → `003` → `004`; `003` cria macroáreas, vínculos e tabelas de publicação, e `004` depende dessas estruturas para criar snapshots por mega setor. As migrações precisam ser aplicadas explicitamente antes de publicar em uma base autorizada; o servidor não aplica migrações no startup. O runner de demonstração já as executa nessa ordem somente no cluster descartável.

O publicador valida respostas completas e alternativas permitidas, considera somente participações dentro do período e associa cada participação ao único mega setor de seu setor operacional. A contagem é feita por ID de participação uma única vez. As médias do IER e das dimensões são calculadas sobre participações individuais válidas do mega setor; Q28–Q31 são booleanos agregados e não entram no IER. Com quatro ou menos participações a publicação armazena apenas `protegido_ou_indisponivel`; com cinco ou mais registra IER, dimensões, alertas e contagem. A publicação continua única por período, transacional, encerrada e sem sobreposição.

Publicações antigas feitas pela política de setor exato não são convertidas automaticamente: suas células podem estar suprimidas individualmente e não permitem reconstruir corretamente um mega setor. Elas permanecem no banco, mas não aparecem na lista de períodos da nova tela. A re-publicação de um período continua impedida.

## Demonstração

Use apenas o procedimento isolado documentado em `web-admin/README.md`. A demonstração carrega o catálogo recebido e semeia cenários fictícios de 4, 5 e 6 participações, incluindo setores operacionais diferentes sob o mesmo mega setor, além de um segundo período com cinco participações em outro mega setor. Ela não acessa a conexão principal do PostgreSQL.

Para um ambiente permanente, aplique as migrações explicitamente, importe o catálogo com uma conexão deliberada e revise os vínculos de setores legados antes de publicar períodos. O painel não remapeia setores existentes por aproximação de nome.
