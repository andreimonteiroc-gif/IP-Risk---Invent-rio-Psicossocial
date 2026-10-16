import { useCallback, useRef } from 'react';
import { router, useFocusEffect, useNavigation } from 'expo-router';

/** @param {string} [stepKey] */
export default function useFlowNavigation(stepKey = 'screen') {
  const navigation = useNavigation();
  const pendingStep = useRef(/** @type {string | null} */ (null));

  useFocusEffect(useCallback(() => {
    pendingStep.current = null;
    return () => { pendingStep.current = stepKey; };
  }, [stepKey]));

  /** @param {() => void} action */
  const run = action => {
    // A ref muda imediatamente, antes de uma nova renderização do React.
    if (pendingStep.current !== null) return;
    pendingStep.current = stepKey;
    try {
      action();
    } catch (error) {
      pendingStep.current = null;
      throw error;
    }
  };

  /** @param {'/questionnaire' | '/review'} pathname @param {Record<string, string>} [params] */
  const open = (pathname, params = {}) => {
    const href = { pathname, params };
    // As rotas deste fluxo pertencem ao mesmo Stack de src/app/_layout.js.
    // Avançar cria a tela apenas se ela ainda não existir na pilha.
    if (navigation.getState()?.routes.some(route => route.name === pathname.slice(1))) {
      router.dismissTo(href);
    } else {
      router.push(href);
    }
  };

  return { run, open };
}
