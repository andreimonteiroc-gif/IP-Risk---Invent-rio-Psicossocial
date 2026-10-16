const assert = require('node:assert/strict');
const { test } = require('node:test');
const { StackRouter } = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
const { createSession, button, card, findAll } = require('./helpers.cjs');

// Redutor da versão instalada do Expo Router, com rotas estáticas do Stack real.
// Não executa o renderer nativo; foco/blur são simulados explicitamente.
function createStackSession(initialRoutes) {
  const session = createSession();
  const routes = initialRoutes.map(route => typeof route === 'string' ? { name: route } : route);
  const options = { routeNames: ['index', 'sector', 'questionnaire-guidance', 'questionnaire', 'review'], routeParamList: {}, routeGetIdList: {} };
  const stack = StackRouter({ initialRouteName: routes[0].name });
  let state = stack.getInitialState(options);
  state.routes[0].params = routes[0].params;
  const dispatch = action => { state = stack.getStateForAction(state, action, options) || state; };
  for (const route of routes.slice(1)) dispatch({ type: 'PUSH', payload: route });
  session.navigation.getState = () => state;
  // A identidade da rota permite verificar se retornamos à instância existente.
  const screens = new Map();
  let focusedScreen;
  for (const [method, type] of Object.entries({ push: 'PUSH', dismissTo: 'POP_TO', replace: 'REPLACE', navigate: 'NAVIGATE' })) {
    session.router[method] = href => {
      session.calls.push([method, JSON.parse(JSON.stringify(href))]);
      const pathname = typeof href === 'string' ? href : href.pathname;
      dispatch({ type, payload: { name: pathname === '/' ? 'index' : pathname.slice(1), params: href.params } });
    };
  }
  session.router.canGoBack = () => state.index > 0;
  session.router.back = () => { session.calls.push(['back']); dispatch({ type: 'GO_BACK' }); };
  const render = () => {
    const route = state.routes[state.index];
    for (const key of Object.keys(session.params)) delete session.params[key];
    Object.assign(session.params, route.params);
    if (!screens.has(route.key)) screens.set(route.key, session.mount(`src/app/${route.name}.js`));
    const screen = screens.get(route.key);
    if (screen !== focusedScreen) {
      focusedScreen?.blur();
      screen.focus();
      focusedScreen = screen;
    }
    return screen.render();
  };
  const fill = () => {
    for (const q of session.load('src/data/questions.js').questions) session.state().selectAnswer(q.id, q.alternatives[0]);
  };
  return { ...session, render, fill, screen: () => focusedScreen, stack: () => state, top: () => state.routes[state.index] };
}

const editRoute = { name: 'questionnaire', params: { fromReview: 'true', questionId: 'Q12' } };
const blocksIn = tree => findAll(tree, node => node.type === 'ReviewBlock');

test('concluir duas vezes, ou concluir e voltar, permanece na revisão existente mesmo após rerender', () => {
  for (const secondLabel of ['Concluir correção', 'Voltar à revisão']) {
    const app = createStackSession(['index', 'questionnaire-guidance', 'questionnaire', 'review', editRoute]);
    app.fill();
    const reviewKey = app.stack().routes[3].key;
    const tree = app.render();
    const correction = app.screen();
    card(tree).onSelect('Nunca');
    button(tree, 'Concluir correção').onPress();
    button(tree, secondLabel).onPress();
    assert.equal(app.top().key, reviewKey);
    assert.equal(app.stack().routes.length, 4);
    assert.equal(app.calls.length, 1);
    assert.equal(app.state().answers.Q12, 'Nunca');
    assert.equal(Object.keys(app.state().answers).length, 31);
    // Rerender de respostas, sem mudança de questão ou novo foco, não libera a trava.
    button(correction.render(), 'Voltar à revisão').onPress();
    assert.equal(app.calls.length, 1);
    assert.equal(app.top().key, reviewKey);
  }
});

test('duplo toque em uma questão abre somente uma correção e foco posterior libera nova correção', () => {
  const app = createStackSession(['index', 'questionnaire', 'review']);
  const reviewKey = app.top().key;
  let tree = app.render();
  blocksIn(tree)[2].props.onToggle();
  tree = app.render();
  blocksIn(tree)[2].props.onEdit('Q12');
  blocksIn(tree)[2].props.onEdit('Q13');
  assert.equal(app.stack().routes.length, 4);
  assert.equal(app.top().params.questionId, 'Q12');
  button(app.render(), 'Voltar à revisão').onPress();
  assert.equal(app.top().key, reviewKey);
  tree = app.render();
  assert.equal(blocksIn(tree)[2].props.expanded, true);
  blocksIn(tree)[2].props.onEdit('Q13');
  assert.equal(app.top().params.questionId, 'Q13');
  assert.equal(app.stack().routes.length, 4);
});

test('retorno da correção tem destino revisão com histórico ausente, diferente ou com telas intermediárias', () => {
  for (const routes of [[editRoute], ['index', editRoute], ['index', 'review', 'sector', editRoute]]) {
    const app = createStackSession(routes);
    const review = app.stack().routes.find(route => route.name === 'review');
    const tree = app.render();
    button(tree, 'Voltar à revisão').onPress();
    button(tree, 'Voltar à revisão').onPress();
    assert.equal(app.top().name, 'review');
    if (review) assert.equal(app.top().key, review.key);
    assert.equal(app.stack().routes.filter(route => route.name === 'review').length, 1);
    assert.equal(app.calls.length, 1);
  }
});

test('retorno da revisão aponta ao questionário normal e reutiliza a rota sem parâmetros de correção', () => {
  for (const routes of [['review'], ['index', 'review'], ['index', editRoute, 'sector', 'review']]) {
    const app = createStackSession(routes);
    app.state().setCurrentIndex(7);
    app.fill();
    const questionnaire = app.stack().routes.find(route => route.name === 'questionnaire');
    const tree = app.render();
    button(tree, 'Voltar ao questionário').onPress();
    button(tree, 'Voltar ao questionário').onPress();
    assert.equal(app.top().name, 'questionnaire');
    assert.equal(app.top().params.fromReview, 'false');
    assert.equal(app.top().params.questionId, undefined);
    if (questionnaire) assert.equal(app.top().key, questionnaire.key);
    assert.equal(app.stack().routes.filter(route => route.name === 'questionnaire').length, 1);
    assert.equal(card(app.render()).question.id, 'Q8');
    assert.equal(Object.keys(app.state().answers).length, 31);
  }
});

test('avançar à revisão e retomar pelas orientações reutilizam destinos já presentes no histórico', () => {
  const reviewApp = createStackSession(['index', 'review', 'questionnaire']);
  reviewApp.fill();
  reviewApp.state().setCurrentIndex(30);
  const reviewKey = reviewApp.stack().routes[1].key;
  const tree = reviewApp.render();
  button(tree, 'Revisar respostas').onPress();
  button(tree, 'Revisar respostas').onPress();
  assert.equal(reviewApp.top().key, reviewKey);
  assert.equal(reviewApp.stack().routes.length, 2);

  const app = createStackSession(['index', 'questionnaire', 'sector', 'questionnaire-guidance']);
  app.fill();
  app.state().setCurrentIndex(14);
  const questionnaireKey = app.stack().routes[1].key;
  const guidance = app.render();
  button(guidance, 'Retomar questionário').onPress();
  button(guidance, 'Iniciar nova participação (apagar respostas)').onPress();
  assert.equal(app.top().key, questionnaireKey);
  assert.equal(app.stack().routes.length, 2);
  assert.equal(card(app.render()).question.id, 'Q15');
  assert.equal(Object.keys(app.state().answers).length, 31);
});

test('iniciar e reiniciar com chamadas duplicadas abrem uma única rota normal', () => {
  const app = createStackSession(['index', 'questionnaire-guidance']);
  const start = app.render();
  button(start, 'Iniciar questionário').onPress();
  button(start, 'Iniciar questionário').onPress();
  assert.equal(app.stack().routes.filter(route => route.name === 'questionnaire').length, 1);
  assert.equal(app.calls.length, 1);

  const restartApp = createStackSession(['index', 'questionnaire', 'sector', 'questionnaire-guidance']);
  restartApp.fill();
  restartApp.state().setCurrentIndex(20);
  const questionnaireKey = restartApp.stack().routes[1].key;
  const restart = restartApp.render();
  button(restart, 'Iniciar nova participação (apagar respostas)').onPress();
  button(restart, 'Iniciar nova participação (apagar respostas)').onPress();
  assert.equal(restartApp.top().key, questionnaireKey);
  assert.equal(restartApp.stack().routes.length, 2);
  assert.equal(restartApp.calls.length, 1);
  assert.equal(restartApp.state().currentIndex, 0);
  assert.equal(Object.keys(restartApp.state().answers).length, 0);
  assert.equal(card(restartApp.render()).question.id, 'Q1');
});

test('consultar orientações por gesto e retomar preserva posição e respostas após remontar questionário', () => {
  const app = createStackSession(['index', 'questionnaire-guidance', 'questionnaire']);
  app.fill();
  app.state().setCurrentIndex(11);
  app.render();
  app.router.back(); // Gesto nativo modelado como GO_BACK, sem usar o botão da Q1.
  const tree = app.render();
  button(tree, 'Retomar questionário').onPress();
  assert.equal(card(app.render()).question.id, 'Q12');
  assert.equal(Object.keys(app.state().answers).length, 31);
});

test('Voltar da Q1 consulta orientações sem perda; reinício explícito limpa respostas e posição', () => {
  const app = createStackSession(['index', 'questionnaire-guidance', 'questionnaire']);
  card(app.render()).onSelect('Sempre');
  const questionnaire = app.render();
  button(questionnaire, 'Voltar').onPress();
  button(questionnaire, 'Voltar').onPress();
  assert.equal(app.top().name, 'questionnaire-guidance');
  assert.equal(app.state().answers.Q1, 'Sempre');
  button(app.render(), 'Retomar questionário').onPress();
  assert.equal(card(app.render()).selectedAnswer, 'Sempre');
  button(app.render(), 'Avançar').onPress();
  assert.equal(card(app.render()).question.id, 'Q2');
  app.router.back();
  const guidance = app.render();
  button(guidance, 'Iniciar nova participação (apagar respostas)').onPress();
  button(guidance, 'Iniciar nova participação (apagar respostas)').onPress();
  assert.equal(app.top().name, 'questionnaire');
  assert.equal(card(app.render()).question.id, 'Q1');
  assert.equal(card(app.render()).selectedAnswer, undefined);
  assert.equal(app.state().currentIndex, 0);
  assert.equal(Object.keys(app.state().answers).length, 0);
});

test('encerrar nas três telas limpa respostas e posição, com uma única navegação', () => {
  for (const name of ['questionnaire-guidance', 'questionnaire', 'review']) {
    const app = createStackSession(['index', name]);
    app.fill();
    app.state().setCurrentIndex(17);
    const tree = app.render();
    button(tree, 'Fechar').onPress();
    button(tree, 'Fechar').onPress();
    assert.equal(app.top().name, 'index');
    assert.equal(app.state().currentIndex, 0);
    assert.equal(Object.keys(app.state().answers).length, 0);
    assert.equal(app.calls.length, 1);
  }
});
