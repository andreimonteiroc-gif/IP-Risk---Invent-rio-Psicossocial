/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { load, mount, findAll, button, card } = require('./helpers.cjs');
const { questions } = load('src/data/questions.js');

test('31 IDs sequenciais, sete blocos, 11 diretas, 16 inversas e quatro binárias', () => {
  assert.equal(questions.length, 31);
  assert.equal(new Set(questions.map(q => q.dimension)).size, 7);
  questions.forEach((q, index) => {
    assert.equal(q.id, `Q${index + 1}`);
    assert.ok(q.text.endsWith('?'));
    assert.equal(q.alternatives.length, index < 27 ? 5 : 2);
    assert.equal(new Set(q.alternatives).size, q.alternatives.length);
  });
  assert.equal(questions.filter(q => q.polarity === 'direta').length, 11);
  assert.equal(questions.filter(q => q.polarity === 'inversa').length, 16);
  assert.equal(questions.filter(q => q.polarity === null).length, 4);
  assert.deepEqual(Array.from(questions[22].alternatives), ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Ruim']);
  for (const q of questions.slice(27)) assert.deepEqual(Array.from(q.alternatives), ['Sim', 'Não']);
});

test('percorre as 31 questões, preserva e permite substituir respostas ao voltar', () => {
  const app = mount('src/screens/QuestionnaireScreen.js');
  let tree = app.render();
  assert.equal(card(tree).selectedAnswer, undefined);
  assert.equal(button(tree, 'Avançar').disabled, true);
  button(tree, 'Avançar').onPress();
  assert.equal(card(app.render()).question.id, 'Q1');
  card(tree).onSelect('alternativa inexistente');
  assert.equal(card(app.render()).selectedAnswer, undefined);
  for (let index = 0; index < 31; index++) {
    tree = app.render();
    assert.equal(card(tree).question.id, `Q${index + 1}`);
    const progress = findAll(tree, n => n.props.accessibilityRole === 'progressbar')[0].props;
    assert.equal(progress.accessibilityValue.now, index + 1);
    card(tree).onSelect(questions[index].alternatives[0]);
    tree = app.render();
    const next = button(tree, index === 30 ? 'Revisar respostas' : 'Avançar');
    assert.equal(next.disabled, false);
    next.onPress();
    next.onPress(); // Toque duplicado não pode saltar uma pergunta sem resposta.
  }
  tree = app.render();
  assert.equal(card(tree).question.id, 'Q31');
  assert.equal(findAll(tree, n => n.props.accessibilityRole === 'alert').length, 0);
  assert.equal(app.calls.length, 1, 'abre a revisão uma única vez na Q31');
  assert.equal(app.calls[0][0], 'push');
  assert.equal(app.calls[0][1].pathname, '/review');
  app.focus(); // O participante retorna da revisão à instância original.
  for (let index = 30; index >= 0; index--) {
    tree = app.render();
    assert.equal(card(tree).question.id, `Q${index + 1}`);
    assert.equal(card(tree).selectedAnswer, questions[index].alternatives[0]);
    if (index > 0) button(tree, 'Voltar').onPress();
  }
  card(tree).onSelect(questions[0].alternatives[4]);
  tree = app.render();
  assert.equal(card(tree).selectedAnswer, questions[0].alternatives[4]);
  button(tree, 'Avançar').onPress();
  button(app.render(), 'Voltar').onPress();
  assert.equal(card(app.render()).selectedAnswer, questions[0].alternatives[4]);
});

test('duas chamadas de Voltar na Q2 antes de renderizar mantêm o índice em zero', () => {
  const app = mount('src/screens/QuestionnaireScreen.js');
  card(app.render()).onSelect(questions[0].alternatives[0]);
  button(app.render(), 'Avançar').onPress();
  let tree = app.render();
  assert.equal(card(tree).question.id, 'Q2');
  card(tree).onSelect(questions[1].alternatives[1]);
  tree = app.render();

  // Reutiliza o mesmo callback, sem renderizar entre os acionamentos.
  const back = button(tree, 'Voltar');
  back.onPress();
  back.onPress();

  tree = app.render(); // Antes da correção, falhava ao acessar questions[-1].
  assert.equal(card(tree).question.id, 'Q1');
  assert.equal(card(tree).selectedAnswer, questions[0].alternatives[0]);
  assert.equal(findAll(tree, node => node.props.accessibilityRole === 'progressbar')[0].props.accessibilityValue.now, 1);
  assert.deepEqual(app.calls, [], 'o acionamento duplicado não deve sair do questionário');

  button(tree, 'Avançar').onPress();
  assert.equal(card(app.render()).question.id, 'Q2');
  assert.equal(card(app.render()).selectedAnswer, questions[1].alternatives[1]);
});

test('retorno das perguntas, fechamento e nova instância vazia', () => {
  const app = mount('src/screens/QuestionnaireScreen.js');
  button(app.render(), 'Voltar').onPress();
  assert.deepEqual(app.calls.pop(), ['dismissTo', '/questionnaire-guidance']);
  app.focus();
  app.router.canGoBack = () => false;
  button(app.render(), 'Voltar').onPress();
  assert.deepEqual(app.calls.pop(), ['dismissTo', '/questionnaire-guidance']);
  app.focus();
  card(app.render()).onSelect(questions[0].alternatives[0]);
  button(app.render(), 'Fechar').onPress();
  assert.deepEqual(app.calls.pop(), ['dismissTo', '/']);
  const fresh = mount('src/screens/QuestionnaireScreen.js');
  assert.equal(card(fresh.render()).selectedAnswer, undefined);
  assert.equal(button(fresh.render(), 'Avançar').disabled, true);
});

test('orientações abrem a rota real de questionário', () => {
  const app = mount('src/screens/QuestionnaireGuidanceScreen.js');
  button(app.render(), 'Iniciar questionário').onPress();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0][0], 'push');
  assert.equal(app.calls[0][1].pathname, '/questionnaire');
  assert.equal(app.calls[0][1].params.fromReview, 'false');
  assert.ok(fs.existsSync(path.resolve(__dirname, '../src/app/questionnaire.js')));
});

test('componente exibe uma única opção selecionada e suporta escala binária', () => {
  const QuestionCard = load('src/components/QuestionCard.js').default;
  for (const question of [questions[0], questions[22], questions[30]]) {
    let chosen;
    const tree = QuestionCard({ question, selectedAnswer: question.alternatives[0], onSelect: answer => { chosen = answer; } });
    const radios = findAll(tree, node => node.props.accessibilityRole === 'radio');
    assert.equal(radios.length, question.alternatives.length);
    assert.equal(radios.filter(node => node.props.accessibilityState.checked).length, 1);
    radios[1].props.onPress();
    assert.equal(chosen, question.alternatives[1]);
  }
});
