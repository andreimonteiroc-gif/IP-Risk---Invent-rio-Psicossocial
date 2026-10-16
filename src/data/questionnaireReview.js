import { questions } from './questions';

/** @typedef {Record<string, string>} Answers */

// A ordem e os nomes vêm do cadastro oficial, sem duplicar perguntas ou faixas.
export const questionBlocks = [...new Set(questions.map(question => question.dimension))].map(title => ({
  title,
  questions: questions.filter(question => question.dimension === title),
}));

/** @param {import('./questions').Question} question @param {Answers} answers */
export function isAnswered(question, answers) {
  return question.alternatives.includes(answers[question.id]);
}

/** @param {readonly import('./questions').Question[]} items @param {Answers} answers */
export function countAnswers(items, answers) {
  return items.filter(question => isAnswered(question, answers)).length;
}

/** @param {Answers} answers */
export function isQuestionnaireComplete(answers) {
  return countAnswers(questions, answers) === questions.length;
}
