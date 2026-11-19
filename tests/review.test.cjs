/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createSession, findAll, button, card } = require('./helpers.cjs');

const blocksIn = tree => findAll(tree, node => node.type === 'ReviewBlock');
const textIn = tree => findAll(tree, node => node.type === 'Text').map(node => node.props.children).flat().join(' ').replace(/\s+/g, ' ');

function fill(session) {
  const { questions } = session.load('src/data/questions.js');
  for (const q of questions) session.state().selectAnswer(q.id, q.alternatives[0]);
}

test('sete blocos oficiais cobrem Q1–Q31 sem duplicação, na ordem do Apêndice A', () => {
  const session = createSession();
  const { questionBlocks } = session.load('src/data/questionnaireReview.js');
  const ranges = [[1, 4], [5, 8], [9, 16], [17, 20], [21, 22], [23, 27], [28, 31]];
  assert.equal(questionBlocks.length, 7);
  questionBlocks.forEach((block, index) => {
    const [start, end] = ranges[index];
    assert.deepEqual(Array.from(block.questions, q => q.id), Array.from({ length: end - start + 1 }, (_, i) => `Q${start + i}`));
  });
  assert.equal(new Set(questionBlocks.flatMap(b => b.questions.map(q => q.id))).size, 31);
});

test('revisão abre pela rota e mostra sete cartões expansíveis e a contagem real', () => {
  const session = createSession();
  const app = session.mount('src/app/review.js');
  assert.ok(fs.existsSync(path.resolve(__dirname, '../src/app/review.js')));
  let tree = app.render();
  assert.equal(blocksIn(tree).length, 7);
  assert.ok(blocksIn(tree).every(b => !b.props.expanded));
  assert.match(textIn(tree), /0 de 31 questões respondidas/);
  blocksIn(tree)[0].props.onToggle();
  tree = app.render();
  assert.equal(blocksIn(tree)[0].props.expanded, true);
  blocksIn(tree)[1].props.onToggle();
  tree = app.render();
  assert.equal(blocksIn(tree)[0].props.expanded, true);
  assert.equal(blocksIn(tree)[1].props.expanded, true);
  blocksIn(tree)[0].props.onToggle();
  assert.equal(blocksIn(app.render())[0].props.expanded, false);
  session.state().selectAnswer('Q1', 'Sempre');
  assert.match(textIn(app.render()), /1 de 31 questões respondidas/);
});

test('cartões mostram perguntas e alternativas oficiais, contagem, pendências e ação de correção', () => {
  const session = createSession();
  const { questionBlocks } = session.load('src/data/questionnaireReview.js');
  const ReviewBlock = session.load('src/components/ReviewBlock.js').default;
  const answers = { Q1: 'Sempre', Q2: 'valor inválido', Q31: 'Não' };
  let chosen;
  for (const block of questionBlocks) {
    const tree = ReviewBlock({ block, answers, expanded: true, onToggle() {}, onEdit: id => { chosen = id; } });
    const expectedCount = block.questions.filter(q => q.alternatives.includes(answers[q.id])).length;
    assert.match(textIn(tree), new RegExp(`${expectedCount} de ${block.questions.length} respondidas`));
    const rows = findAll(tree, n => n.type === 'Pressable' && n.props.accessibilityLabel.endsWith('Corrigir resposta'));
    assert.equal(rows.length, block.questions.length);
    block.questions.forEach((question, i) => {
      const text = textIn(rows[i]);
      assert.ok(text.includes(question.text));
      assert.ok(text.includes(question.alternatives.includes(answers[question.id]) ? answers[question.id] : 'Não respondida'));
      rows[i].props.onPress();
      assert.equal(chosen, question.id);
    });
    const collapsed = ReviewBlock({ block, answers, expanded: false, onToggle() {}, onEdit() {} });
    assert.equal(findAll(collapsed, n => n.type === 'Pressable').length, 1);
  }
});

test('estado sobrevive à troca e remontagem de telas; corrigir uma resposta preserva as outras 30', () => {
  const session = createSession();
  fill(session);
  const before = { ...session.state().answers };
  const review = session.mount('src/screens/ReviewScreen.js');
  blocksIn(review.render())[2].props.onToggle();
  blocksIn(review.render())[2].props.onEdit('Q12');
  const call = session.calls.pop();
  assert.equal(call[0], 'push');
  assert.equal(call[1].pathname, '/questionnaire');
  Object.assign(session.params, call[1].params);
  const correction = session.mount('src/app/questionnaire.js');
  let tree = correction.render();
  assert.equal(card(tree).question.id, 'Q12');
  assert.equal(card(tree).selectedAnswer, before.Q12);
  card(tree).onSelect('Nunca');
  tree = correction.render();
  assert.equal(card(tree).selectedAnswer, 'Nunca');
  button(tree, 'Concluir correção').onPress();
  assert.deepEqual(session.calls.pop(), ['dismissTo', '/review']);
  assert.equal(blocksIn(review.render())[2].props.expanded, true);
  assert.equal(blocksIn(review.render())[2].props.answers.Q12, 'Nunca');
  for (const [id, answer] of Object.entries(before)) assert.equal(session.state().answers[id], id === 'Q12' ? 'Nunca' : answer);
  assert.match(textIn(session.mount('src/app/review.js').render()), /31 de 31 questões respondidas/);
});

test('incompleto e falta de setor/período não habilitam confirmação nem simulam envio', () => {
  const session = createSession();
  const { isQuestionnaireComplete, countAnswers } = session.load('src/data/questionnaireReview.js');
  const { questions } = session.load('src/data/questions.js');
  const app = session.mount('src/screens/ReviewScreen.js');
  assert.equal(isQuestionnaireComplete({ Q999: 'Sim' }), false);
  assert.equal(countAnswers(questions, { Q1: 'Inválida', Q31: 'Sim' }), 1);
  let tree = app.render();
  assert.equal(button(tree, 'Continuar para confirmação').disabled, true);
  button(tree, 'Continuar para confirmação').onPress();
  assert.equal(findAll(tree, n => n.props.accessibilityRole === 'alert').length, 1);
  fill(session);
  assert.equal(isQuestionnaireComplete(session.state().answers), true);
  tree = app.render();
  assert.equal(findAll(tree, n => n.props.accessibilityRole === 'alert').length, 0);
  assert.equal(button(tree, 'Continuar para confirmação').disabled, true);
  button(tree, 'Continuar para confirmação').onPress();
  assert.deepEqual(session.calls, []);
});

test('questão ausente pode ser preenchida diretamente e retornar à revisão; parâmetros inválidos são seguros', () => {
  const session = createSession();
  Object.assign(session.params, { questionId: 'Q31', fromReview: 'true' });
  session.router.canGoBack = () => false;
  const app = session.mount('src/screens/QuestionnaireScreen.js');
  let tree = app.render();
  assert.equal(card(tree).question.id, 'Q31');
  assert.equal(button(tree, 'Concluir correção').disabled, true);
  button(tree, 'Concluir correção').onPress();
  assert.deepEqual(session.calls, []);
  card(tree).onSelect('Não');
  button(app.render(), 'Concluir correção').onPress();
  assert.deepEqual(session.calls.pop(), ['dismissTo', '/review']);
  assert.equal(session.state().answers.Q31, 'Não');
  session.params.questionId = 'Q999';
  tree = app.render();
  assert.equal(card(tree).question.id, 'Q1');
  button(tree, 'Voltar à revisão').onPress();
  assert.deepEqual(session.calls.pop(), ['dismissTo', '/review']);
});

test('Provider rejeita IDs/alternativas inválidos e limpa respostas ao reiniciar ou fechar', () => {
  const session = createSession();
  session.state().selectAnswer('Q999', 'Sim');
  session.state().selectAnswer('Q1', 'Sim');
  assert.equal(Object.keys(session.state().answers).length, 0);
  fill(session);
  const guidance = session.mount('src/screens/QuestionnaireGuidanceScreen.js');
  button(guidance.render(), 'Iniciar nova participação (apagar respostas)').onPress();
  assert.equal(Object.keys(session.state().answers).length, 0);
  fill(session);
  const review = session.mount('src/screens/ReviewScreen.js');
  button(review.render(), 'Fechar').onPress();
  assert.equal(Object.keys(session.state().answers).length, 0);
  assert.deepEqual(session.calls.pop(), ['dismissTo', '/']);
  fill(session);
  button(session.mount('src/screens/QuestionnaireScreen.js').render(), 'Fechar').onPress();
  assert.equal(Object.keys(session.state().answers).length, 0);
});

test('voltar da revisão conserva a Q31; retorno sem histórico usa rota segura', () => {
  const session = createSession();
  const questionnaire = session.mount('src/screens/QuestionnaireScreen.js');
  const { questions } = session.load('src/data/questions.js');
  questions.forEach((question, i) => {
    card(questionnaire.render()).onSelect(question.alternatives[0]);
    button(questionnaire.render(), i === 30 ? 'Revisar respostas' : 'Avançar').onPress();
    if (i === 26) {
      assert.equal(session.calls.pop()[1].pathname, '/sensitive-guidance');
      const sensitive = session.mount('src/screens/SensitiveGuidanceScreen.js');
      button(sensitive.render(), 'Entendi, continuar').onPress();
      assert.equal(session.calls.pop()[1].pathname, '/questionnaire');
      assert.equal(card(questionnaire.render()).question.id, 'Q28');
    }
  });
  const next = session.calls.pop();
  assert.equal(next[0], 'push');
  assert.equal(next[1].pathname, '/review');
  const review = session.mount('src/screens/ReviewScreen.js');
  assert.match(textIn(review.render()), /31 de 31 questões respondidas/);
  button(review.render(), 'Voltar ao questionário').onPress();
  let back = session.calls.pop();
  assert.equal(back[0], 'dismissTo');
  assert.equal(back[1].pathname, '/questionnaire');
  assert.equal(back[1].params.fromReview, 'false');
  assert.equal(card(questionnaire.render()).question.id, 'Q31');
  assert.equal(card(questionnaire.render()).selectedAnswer, 'Sim');
  session.router.canGoBack = () => false;
  review.focus();
  button(review.render(), 'Voltar ao questionário').onPress();
  back = session.calls.pop();
  assert.equal(back[0], 'dismissTo');
  assert.equal(back[1].pathname, '/questionnaire');
  assert.equal(Object.keys(session.state().answers).length, 31);
});
