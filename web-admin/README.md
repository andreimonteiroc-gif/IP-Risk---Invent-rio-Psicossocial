# Painel Web — Inventário Psicossocial

Aplicação Next.js baseada no template administrativo do professor. O painel consulta apenas publicações agregadas do backend existente; não contém resultados de demonstração no frontend.

## Executar a demonstração local

1. Em `app-mobile/backend`, configure uma conta administrativa local e inicie a demonstração isolada, conforme o [roteiro do backend](../docs/backend-administrativo-2026-10-21.md):

   ```powershell
   npm.cmd run admin:setup -- gerenciador.local
   npm.cmd run demo:admin
   ```

   Execute `admin:setup` somente na primeira configuração, quando ainda não existir `backend/.admin.local.json`. A senha é solicitada interativamente. O primeiro usuário recebe o papel Gerenciador; não execute o comando para substituir uma configuração existente. A demonstração cria um PostgreSQL temporário independente e usa somente participações fictícias. Publica dois períodos fechados: no período principal, mega setor 1 fica protegido (4), mega setor 2 é liberado (5) e mega setor 3 é liberado (6); no período anterior, mega setor 4 é liberado (5).

2. Em outro terminal, nesta pasta, instale as dependências e configure o endereço privado do backend:

   ```powershell
   Copy-Item .env.example .env.local
   npm.cmd install
   npm.cmd run dev -- --port 3001
   ```

3. Abra `http://127.0.0.1:3001` e entre com a conta criada no primeiro passo.

Se o npm no Windows retornar `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, repita a instalação usando o repositório de certificados do sistema: `$env:NODE_OPTIONS='--use-system-ca'; npm.cmd install; Remove-Item Env:NODE_OPTIONS`.

O backend permanece em `127.0.0.1:3000`. `ADMIN_API_BASE_URL` é lida somente pelas rotas servidoras do Next.js. As credenciais não são incluídas em código nem no bundle do navegador.

## Sessão e privacidade

- O navegador recebe somente um cookie de sessão `HttpOnly`, `SameSite=Strict`, com prazo limitado. O token Bearer não fica em `localStorage`, `sessionStorage` ou JavaScript cliente.
- As rotas servidoras do Next.js encaminham apenas chamadas administrativas específicas, sem cabeçalho `Origin`, mantendo a política de acesso do backend.
- Os resultados são filtrados por um mega setor e um período publicado. A API devolve somente grupos liberados pelo limiar mínimo de cinco participações válidas.
- Grupos abaixo do limiar não exibem IER, dimensões, alertas ou contagem. A tela nunca recebe respostas ou identificadores de participantes.
- Somente o Gerenciador pode abrir **Usuários** e cadastrar profissionais autorizados. Não há cadastro público; usuários profissionais não podem gerenciar contas nem alterar o próprio papel. As contas e hashes scrypt ficam somente em `backend/.admin.local.json`, sem tabela de usuários no PostgreSQL.
- A demonstração omite o callback de persistência local de novas contas; contas adicionadas durante `demo:admin` existem apenas na memória daquele processo.

## Verificações

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```
