/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Executa os componentes/callbacks e o Provider reais. Somente o runtime de
// hooks, as primitivas nativas e o roteador são substituídos: não é teste E2E.
function createSession() {
  const cache = new Map();
  let states = [];
  let cursor = 0;
  let activeScreen;
  const calls = [];
  const params = {};
  const router = { canGoBack: () => true };
  const navigation = { getState: () => ({ routes: [] }) };
  for (const method of ['push', 'navigate', 'replace', 'back', 'dismissTo']) {
    router[method] = (...args) => calls.push([method, ...args]);
  }
  const hooks = {
    createContext(initial) {
      const context = { current: initial, Provider: null };
      context.Provider = context;
      return context;
    },
    useContext: context => context.current,
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = { current: initial };
      return states[slot];
    },
    useCallback(callback, dependencies) {
      const slot = cursor++;
      const previous = states[slot];
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous.dependencies[index]))) {
        states[slot] = { callback, dependencies };
      }
      return states[slot].callback;
    },
    useState(initial) {
      const slots = states;
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
  };

  function load(relativeFile) {
    const filename = path.resolve(__dirname, '..', relativeFile);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const jsx = (type, props) => ({ type, props: props || {} });
    const localRequire = name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'expo-router') return {
        router, useLocalSearchParams: () => params, useNavigation: () => navigation,
        useFocusEffect(callback) {
          const slot = cursor++;
          const previous = activeScreen.effects.get(slot);
          if (!previous || previous.callback !== callback) {
            previous?.cleanup?.();
            activeScreen.effects.set(slot, { callback, pending: true });
          }
        },
      };
      if (name === 'react-native') return {
        Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: value => value },
      };
      if (name.endsWith('/ScreenLayout')) return {
        __esModule: true, default: 'ScreenLayout', useScreenMetrics: () => ({ scale: 1, textScale: 1 }),
      };
      if (name.endsWith('/ScreenButton')) return { __esModule: true, default: 'ScreenButton' };
      if (name.endsWith('/QuestionCard')) return { __esModule: true, default: 'QuestionCard' };
      if (name.endsWith('/ReviewBlock')) return { __esModule: true, default: 'ReviewBlock' };
      if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.js`)));
      throw new Error(`Unexpected import: ${name}`);
    };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(source, { require: localRequire, module, exports: module.exports });
    return module.exports;
  }

  const providerStates = [];
  const contextModule = load('src/state/QuestionnaireContext.js');
  // Publica o value do Provider real no contexto criado por ele.
  let value;
  function renderProvider() {
    states = providerStates;
    cursor = 0;
    const tree = contextModule.QuestionnaireProvider({ children: null });
    value = tree.props.value;
    tree.type.current = value;
  }
  renderProvider();
  function mount(file) {
    const localStates = [];
    const screen = { effects: new Map(), focused: true };
    const Component = load(file).default;
    const focus = () => {
      screen.focused = true;
      for (const effect of screen.effects.values()) {
        effect.cleanup?.();
        effect.cleanup = effect.callback();
        effect.pending = false;
      }
    };
    const blur = () => {
      screen.focused = false;
      for (const effect of screen.effects.values()) { effect.cleanup?.(); effect.cleanup = undefined; }
    };
    return { calls, router, params, focus, blur, render: () => {
      renderProvider();
      states = localStates;
      cursor = 0;
      activeScreen = screen;
      const tree = Component();
      for (const effect of screen.effects.values()) {
        if (effect.pending && screen.focused) {
          effect.cleanup = effect.callback();
          effect.pending = false;
        }
      }
      activeScreen = undefined;
      return tree;
    } };
  }
  return { load, mount, calls, router, params, navigation, state: () => { renderProvider(); return value; } };
}

function findAll(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => findAll(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props.children, predicate)];
}
const button = (tree, label) => findAll(tree, node => (node.type === 'ScreenButton' && node.props.label === label)
  || (node.type === 'Pressable' && node.props.accessibilityLabel === label))[0].props;
const card = tree => findAll(tree, node => node.type === 'QuestionCard')[0].props;

module.exports = { createSession, findAll, button, card, load: file => createSession().load(file), mount: file => createSession().mount(file) };
