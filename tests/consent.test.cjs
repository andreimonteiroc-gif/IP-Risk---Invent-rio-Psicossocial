const assert = require('node:assert/strict');
const { test } = require('node:test');
const { findAll, button, mount } = require('./helpers.cjs');

function textContent(tree) {
  return findAll(tree, node => node.type === 'Text')
    .flatMap(node => Array.isArray(node.props.children) ? node.props.children : [node.props.children])
    .filter(value => typeof value === 'string')
    .join(' ');
}

test('TCLE apresenta título oficial e as 7 seções completas do IP RISK', () => {
  const screen = mount('src/screens/ConsentScreen.js');
  const tree = screen.render();
  const content = textContent(tree);

  assert.match(content, /Termo de Consentimento Livre e Esclarecido \(TCLE\) e Aviso de Privacidade — IP RISK/);
  for (const heading of [
    '1. O que é o Aplicativo e sua Finalidade',
    '2. Responsabilidade pela Pesquisa e Desenvolvimento Tecnológico',
    '3. Como Funciona a sua Participação',
    '4. Privacidade, Anonimato Absoluto e Conformidade com a LGPD',
    '5. Armazenamento Temporário e Segurança',
    '6. Perguntas Sensíveis e Voluntariedade',
    '7. Consentimento',
  ]) assert.ok(content.includes(heading), `Seção ausente: ${heading}`);
  assert.match(content, /COPSOQ III/);
  assert.match(content, /Wellington Moreira/);
  assert.match(content, /Andrei Matheus/);
  assert.match(content, /13\.709\/2018/);
  assert.match(content, /31 questões/);
  assert.doesNotMatch(content, /VERSÃO DEMONSTRATIVA|TCLE EM REVISÃO|Minuta para demonstração acadêmica|Esta escolha controla somente/);
  assert.equal(button(tree, 'Iniciar questionário').disabled, true);
});

test('iniciar questionário exige aceite do TCLE para ir a /sector e recusa navega para /refusal', () => {
  const agreeScreen = mount('src/screens/ConsentScreen.js');
  let tree = agreeScreen.render();
  assert.equal(button(tree, 'Iniciar questionário').disabled, true);
  assert.deepEqual(agreeScreen.calls, []);

  findAll(tree, node => node.props.accessibilityRole === 'radio')[0].props.onPress();
  tree = agreeScreen.render();
  assert.equal(button(tree, 'Iniciar questionário').disabled, false);
  button(tree, 'Iniciar questionário').onPress();
  assert.deepEqual(agreeScreen.calls, [['push', '/sector']]);

  const refuseScreen = mount('src/screens/ConsentScreen.js');
  tree = refuseScreen.render();
  assert.equal(button(tree, 'Iniciar questionário').disabled, true);
  findAll(tree, node => node.props.accessibilityRole === 'radio')[1].props.onPress();
  assert.deepEqual(refuseScreen.calls, [['push', '/refusal']]);
});
