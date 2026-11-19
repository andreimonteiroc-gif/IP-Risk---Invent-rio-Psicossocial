const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSession, button, findAll } = require('./helpers.cjs');

const period = { id: 7, nome: 'Período fictício', vigente: true, data_inicio: '2026-01-01', data_fim: '2027-01-01' };
const sector = { id: 12, nome: 'Setor vindo da API de teste' };
const megaSectors = [sector, ...Array.from({ length: 7 }, (_, index) => ({ id: index + 13, nome: `Setor ${index + 2}` }))];
const ok = () => new Response(JSON.stringify({ status: 'ok', modo: 'demonstracao', mensagem: 'Salvo.' }), { status: 201 });
const text = tree => findAll(tree, node => node.type === 'Text').flatMap(node => node.props.children).join(' ');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fill(session) {
  session.state().selectCollection(sector, period);
  for (const question of session.load('src/data/questions.js').questions) session.state().selectAnswer(question.id, question.alternatives[0]);
}

function catalogFetch({ sectors = megaSectors, periods = [period], mode = 'demonstracao' } = {}) {
  return async url => new Response(JSON.stringify(url.endsWith('/health') ? { modo: mode, recebimento_habilitado: mode === 'demonstracao' }
    : url.endsWith('/mega-setores') ? sectors : periods), { status: 200 });
}

test('conversão explícita Q1–Q31 mantém setor/período, alternativas e rejeita incompleto', () => {
  const session = createSession();
  const { toSubmission } = session.load('src/data/submission.js');
  assert.throws(() => toSubmission({}, sector, period));
  fill(session);
  const body = toSubmission(session.state().answers, sector, period);
  assert.equal(body.mega_setor_id, 12);
  assert.equal(body.periodo_id, 7);
  assert.deepEqual(Array.from(body.respostas, item => item.questao_numero), Array.from({ length: 31 }, (_, i) => i + 1));
  assert.equal(body.respostas[22].alternativa, 'Excelente');
  assert.equal(body.respostas[30].alternativa, 'Sim');
  assert.throws(() => toSubmission(session.state().answers, null, period));
});

test('oito setores carregam pela API, guardam ID e exibem período, sem aviso de dados fictícios', async () => {
  const session = createSession({ fetchImpl: catalogFetch() });
  const screen = session.mount('src/screens/SectorScreen.js');
  assert.match(text(screen.render()), /Carregando/);
  assert.equal(button(screen.render(), 'Continuar').disabled, true);
  await tick();
  let tree = screen.render();
  assert.equal(findAll(tree, node => node.props.accessibilityRole === 'radio').length, 8);
  assert.match(text(tree), /Setor vindo da API de teste/);
  assert.doesNotMatch(text(tree), /mega-setor|dados fictícios/i);
  assert.doesNotMatch(text(tree), /Docência|Biblioteca/);
  findAll(tree, node => node.props.accessibilityRole === 'radio')[0].props.onPress();
  tree = screen.render();
  assert.equal(session.state().sector.id, 12);
  assert.equal(session.state().period.id, 7);
  assert.equal(button(tree, 'Continuar').disabled, false);
  button(tree, 'Continuar').onPress();
  button(tree, 'Continuar').onPress();
  assert.equal(session.calls.length, 1);
});

test('ausência de setores/período, múltiplos vigentes e backend sem demonstração bloqueiam avanço', async () => {
  for (const options of [{ sectors: [] }, { sectors: megaSectors.slice(0, 7) },
    { sectors: [...megaSectors.slice(0, 7), megaSectors[0]] }, { periods: [] }, { periods: [{ ...period, vigente: false }] },
    { periods: [period, { ...period, id: 8 }] }, { mode: 'desabilitado' }]) {
    const session = createSession({ fetchImpl: catalogFetch(options) });
    const screen = session.mount('src/screens/SectorScreen.js');
    screen.render();
    await tick();
    const tree = screen.render();
    assert.equal(button(tree, 'Continuar').disabled, true);
    assert.equal(findAll(tree, node => node.props.accessibilityRole === 'alert').length, 1);
    assert.equal(session.state().sector, null);
    assert.equal(session.state().period, null);
  }
});

test('falha ao carregar permite nova tentativa sem apagar respostas', async () => {
  const session = createSession();
  session.state().selectAnswer('Q1', 'Sempre');
  const screen = session.mount('src/screens/SectorScreen.js');
  screen.render(); await tick();
  session.network.fetch = catalogFetch();
  button(screen.render(), 'Tentar carregar novamente').onPress();
  screen.render(); await tick();
  assert.match(text(screen.render()), /Período fictício/);
  assert.equal(session.state().answers.Q1, 'Sempre');
});

test('incompleto não faz POST, mesmo chamando diretamente o submit', async () => {
  let calls = 0;
  const session = createSession({ fetchImpl: async () => { calls++; return ok(); } });
  session.state().selectCollection(sector, period);
  await session.state().submit();
  assert.equal(calls, 0);
  assert.equal(session.state().submissionStatus, 'error');
});

test('confirmação, indicador e duplo clique: somente um POST, sucesso após resposta válida', async () => {
  let release;
  let calls = 0;
  let submitted;
  const gate = new Promise(resolve => { release = resolve; });
  const session = createSession({ fetchImpl: async (url, options) => { calls++; submitted = JSON.parse(options.body); await gate; return ok(); } });
  fill(session);
  const screen = session.mount('src/screens/SubmissionConfirmationScreen.js');
  const send = button(screen.render(), 'Confirmar envio');
  send.onPress();
  assert.equal(calls, 1);
  assert.equal(session.state().submissionStatus, 'sending');
  assert.deepEqual(session.calls.pop(), ['replace', '/submission-sending']);
  assert.match(text(session.mount('src/screens/SubmissionSendingScreen.js').render()), /Enviando suas respostas/);
  send.onPress();
  assert.equal(calls, 1);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(session.state().submissionStatus, 'success');
  assert.deepEqual(session.calls.pop(), ['replace', '/submission-success']);
  assert.match(text(session.mount('src/screens/SubmissionSuccessScreen.js').render()), /Questionário enviado com sucesso!/);
  assert.equal(submitted.mega_setor_id, 12);
  assert.equal(Object.hasOwn(submitted, 'setor_id'), false);
  assert.equal(submitted.respostas.length, 31);
  await session.state().submit();
  assert.equal(calls, 1);
});

test('falha de rede conserva as 31 respostas, trava correções e reenvia mesmo corpo/chave após remontagem', async () => {
  const posts = [];
  const session = createSession({ fetchImpl: async (url, options) => { posts.push(options); throw new Error('rede'); } });
  fill(session);
  const before = JSON.stringify(session.state().answers);
  await session.state().submit();
  assert.equal(session.state().submissionStatus, 'error');
  assert.equal(session.state().submissionLocked, true);
  assert.equal(JSON.stringify(session.state().answers), before);
  session.state().selectAnswer('Q1', 'Nunca');
  session.state().selectCollection({ id: 99, nome: 'Outro' }, period);
  assert.equal(JSON.stringify(session.state().answers), before);
  assert.equal(session.state().sector.id, 12);
  session.network.fetch = async (url, options) => { posts.push(options); return ok(); };
  const errorScreen = session.mount('src/screens/SubmissionErrorScreen.js');
  button(errorScreen.render(), 'Tentar novamente').onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(posts[0].body, posts[1].body);
  assert.equal(posts[0].headers['Idempotency-Key'], posts[1].headers['Idempotency-Key']);
  assert.equal(session.state().submissionStatus, 'success');
});

test('500, JSON inesperado e falso sucesso 200 nunca mostram confirmação nem apagam respostas', async () => {
  for (const response of [new Response(JSON.stringify({ codigo: 'FALHA_PERSISTENCIA' }), { status: 500 }),
    new Response('HTML inesperado', { status: 201 }),
    new Response(JSON.stringify({ status: 'ok', modo: 'demonstracao', mensagem: 'ok' }), { status: 200 }),
    new Response(JSON.stringify({ status: 'ok', modo: 'producao', mensagem: 'ok' }), { status: 201 })]) {
    const session = createSession({ fetchImpl: async () => response });
    fill(session);
    await session.state().submit();
    assert.equal(session.state().submissionStatus, 'error');
    assert.equal(Object.keys(session.state().answers).length, 31);
    assert.equal(session.state().submissionLocked, true);
    assert.doesNotMatch(text(session.mount('src/screens/ReviewScreen.js').render()), /Envio confirmado pela API/);
  }
});

test('mega-setor inválido e período encerrado preservam respostas e permitem corrigir seleção', async () => {
  for (const codigo of ['MEGA_SETOR_INVALIDO', 'PERIODO_INVALIDO']) {
    const session = createSession({ fetchImpl: async () => new Response(JSON.stringify({ codigo }), { status: 422 }) });
    fill(session);
    await session.state().submit();
    assert.equal(session.state().submissionLocked, false);
    assert.equal(Object.keys(session.state().answers).length, 31);
    const tree = session.mount('src/screens/ReviewScreen.js').render();
    button(tree, 'Selecionar setor e período').onPress();
    assert.deepEqual(session.calls.pop(), ['dismissTo', '/sector']);
  }
});

test('timeout cancela a espera e mantém resultado incerto para reenvio', async () => {
  const session = createSession();
  const { createApi } = session.load('src/services/api.js');
  const api = createApi({ baseUrl: 'http://demo.test', timeoutMs: 10, fetchImpl: async (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('abort')));
  }) });
  await assert.rejects(() => api.submit({}, 'chave'), /Sem confirmação/);
});

test('nova participação usa outra chave e fechar tentativa incerta exige ação explícita', async () => {
  const keys = [];
  const session = createSession({ fetchImpl: async (url, options) => { keys.push(options.headers['Idempotency-Key']); throw new Error('rede'); } });
  fill(session); await session.state().submit();
  const screen = session.mount('src/screens/ReviewScreen.js');
  button(screen.render(), 'Fechar').onPress();
  assert.equal(Object.keys(session.state().answers).length, 31);
  assert.equal(session.calls.length, 0);
  button(screen.render(), 'Descartar tentativa e fechar').onPress();
  assert.equal(Object.keys(session.state().answers).length, 0);
  assert.equal(session.state().sector, null);
  fill(session); await session.state().submit();
  assert.notEqual(keys[0], keys[1]);
});
