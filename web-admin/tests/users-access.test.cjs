/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const source = file => readFileSync(join(__dirname, '..', 'src', file), 'utf8');

test('a página de usuários verifica o papel no servidor antes de carregar a lista', () => {
  const page = source('app/admin/usuarios/page.tsx');
  assert.match(page, /session\.papel !== "gerenciador"/);
  assert.match(page, /admin\/usuarios/);
});

test('o menu só apresenta gerenciamento de usuários após confirmar o papel Gerenciador', () => {
  const menu = source('themes/components/menu.tsx');
  assert.match(menu, /fetch\("\/api\/admin\/sessao"/);
  assert.match(menu, /session\?\.papel === "gerenciador"/);
  assert.match(menu, /canManageUsers && <Link/);
});

test('o formulário de login não oferece cadastro público', () => {
  const form = source('app/(login)/_form.tsx');
  assert.doesNotMatch(form, /href=.*cadastro|href=.*registr|Criar conta|Cadastrar usuário/i);
});
