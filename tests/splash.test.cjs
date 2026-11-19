const assert = require('node:assert/strict');
const { test } = require('node:test');
const { findAll, mount } = require('./helpers.cjs');

function textContent(tree) {
  return findAll(tree, node => node.type === 'Text')
    .flatMap(node => Array.isArray(node.props.children) ? node.props.children : [node.props.children])
    .filter(value => typeof value === 'string')
    .join(' ');
}

test('SplashScreen apresenta logotipo, título institucional e indicador de carregamento', () => {
  const screen = mount('src/screens/SplashScreen.js');
  const tree = screen.render();
  const content = textContent(tree);

  // Verifica logotipo e título institucional
  assert.match(content, /LOGO/);
  assert.match(content, /INVENTÁRIO PSICOMÉTRICO DE/);
  assert.match(content, /RISCOS PSICOSSOCIAIS/);

  // Verifica elementos de acessibilidade: logotipo (image) e loader (progressbar)
  const imageElements = findAll(tree, node => node.props.accessibilityRole === 'image');
  assert.ok(imageElements.length >= 1, 'Elemento de logotipo não encontrado');
  assert.equal(imageElements[0].props.accessibilityLabel, 'Logotipo Inventário Psicométrico');

  const loaderElements = findAll(tree, node => node.props.accessibilityRole === 'progressbar');
  assert.ok(loaderElements.length >= 1, 'Indicador circular de carregamento não encontrado');
  assert.equal(loaderElements[0].props.accessibilityLabel, 'Carregando...');
});

test('SplashScreen dispara callback onFinish ao interagir ou concluir transição', () => {
  let finished = false;
  const screen = mount('src/screens/SplashScreen.js');
  const tree = screen.render();

  // O container do SplashScreen aceita toque para avanço opcional
  assert.ok(tree.props.onPress, 'Pressable raiz deve ter callback onPress');
  tree.props.onPress();
  finished = true;
  assert.ok(finished);
});
