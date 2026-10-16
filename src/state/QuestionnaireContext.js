import { createContext, useContext, useState } from 'react';
import { questions } from '../data/questions';

/** @typedef {{ answers: import('../data/questionnaireReview').Answers, currentIndex: number, setCurrentIndex: import('react').Dispatch<import('react').SetStateAction<number>>, selectAnswer: (id: string, answer: string) => void, resetAnswers: () => void }} QuestionnaireState */
const QuestionnaireContext = createContext(/** @type {QuestionnaireState | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function QuestionnaireProvider({ children }) {
  // Vive acima das rotas: desmontar uma tela não apaga as demais respostas.
  // Não grava dados sensíveis em disco nem os coloca nos parâmetros da URL.
  const [answers, setAnswers] = useState(/** @type {import('../data/questionnaireReview').Answers} */ ({}));
  const [currentIndex, setCurrentIndex] = useState(0);
  /** @param {string} id @param {string} answer */
  const selectAnswer = (id, answer) => {
    const question = questions.find(item => item.id === id);
    if (!question?.alternatives.includes(answer)) return;
    setAnswers(previous => ({ ...previous, [id]: answer }));
  };
  const resetAnswers = () => { setAnswers({}); setCurrentIndex(0); };

  return <QuestionnaireContext.Provider value={{ answers, currentIndex, setCurrentIndex, selectAnswer, resetAnswers }}>{children}</QuestionnaireContext.Provider>;
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (!context) throw new Error('useQuestionnaire deve estar dentro de QuestionnaireProvider');
  return context;
}
