# Inventário Psicossocial (IP RISK)

Sistema desenvolvido como Trabalho de Conclusão de Curso (TCC) para coleta anônima e análise agregada de riscos psicossociais no ambiente de trabalho, composto por aplicativo mobile em React Native (Expo), backend REST em Node.js/Express com PostgreSQL e painel web administrativo em Next.js.

## Estrutura do Projeto

- `src/` — Aplicativo mobile (Expo / React Native + Expo Router) para preenchimento do questionário psicossocial.
- `backend/` — API REST (Express + PostgreSQL) responsável pelo recebimento idempotente de participações, cálculo psicométrico (IER) e rotas administrativas protegidas.
- `web-admin/` — Painel web administrativo (Next.js App Router) com BFF próprio para autenticação, consulta ao dashboard de resultados e gestão de usuários autorizados.
- `docs/` — Documentação técnica e minutas de apoio do projeto.
- `tests/` — Testes automatizados do aplicativo mobile.

## Funcionalidades Principais

### Aplicativo Mobile (`src/`)
- Fluxo de boas-vindas, leitura e aceite/recusa do Termo de Consentimento Livre e Esclarecido (TCLE), com opção de exportação em PDF (`expo-print` / `expo-sharing`).
- Seleção do setor (macroárea/mega setor) e período de coleta vigente.
- Questionário com 31 questões (Q1 a Q31), divididas entre itens de escala (Q1–Q27) e itens de exposição/alerta (Q28–Q31), além de tela de orientação para temas sensíveis.
- Revisão das respostas antes da confirmação e envio idempotente (`Idempotency-Key` UUID v4) sem identificação pessoal do respondente.

### Backend (`backend/`)
- Endpoints públicos para consulta de setores/mega setores, períodos vigentes e submissão anônima de participações (`POST /participacoes`).
- Cálculo do Índice de Exposição a Riscos (IER) global e das sete dimensões, com classificação por semáforo (verde, amarelo, vermelho) e agregação de alertas (Q28–Q31).
- Regra de proteção ao anonimato: exibição de resultados agregados apenas para grupos publicados com mínimo de 5 participações válidas.
- Autenticação administrativa com hash `scrypt`, sessões via token Bearer em memória, controle de tentativas e separação de papéis (`gerenciador` / Superadministrador e `profissional_autorizado`).

### Painel Web Administrativo (`web-admin/`)
- Login e gestão de sessão via cookies `HttpOnly` e `SameSite=Strict` encapsulados nas rotas de API do Next.js (BFF).
- **Dashboard:** consulta de resultados publicados por setor e período de coleta, exibindo IER global, total de participações válidas, classificação de risco, pontuações das sete dimensões e alertas agregados.
- **Gestão de Usuários:** cadastro, edição, ativação/desativação e redefinição de senha de profissionais autorizados (restrito ao Superadministrador).

## Pré-requisitos

- Node.js (LTS) e npm
- PostgreSQL
- Expo CLI / aplicativo Expo Go (para execução do app mobile)

## Configuração de Variáveis de Ambiente

Copie os arquivos de exemplo e preencha com seus valores locais antes de executar (nunca versione arquivos `.env` ou `.admin.local.json`):

- Raiz do app mobile: copie `.env.example` para `.env`
- Backend: copie `backend/.env.example` para `backend/.env`
- Painel web: copie `web-admin/.env.example` para `web-admin/.env.local`

Consulte também `backend/README.md` e `web-admin/README.md` para instruções específicas de setup inicial, migrações SQL, criação da conta administrativa (`npm run admin:setup`) e modo de demonstração isolada.
