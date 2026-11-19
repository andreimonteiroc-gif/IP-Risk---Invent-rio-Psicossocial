import { questions } from './questions';
import { isQuestionnaireComplete } from './questionnaireReview';

/** @param {import('./questionnaireReview').Answers} answers
 * @param {import('../services/api').MegaSector | null} sector
 * @param {import('../services/api').Period | null} period
 * @returns {import('../services/api').Submission} */
export function toSubmission(answers, sector, period) {
  if (!sector || !period || !Number.isInteger(sector.id) || sector.id <= 0 || !Number.isInteger(period.id) || period.id <= 0) {
    throw new Error('Selecione um setor e um período na API de demonstração.');
  }
  if (!isQuestionnaireComplete(answers)) throw new Error('Responda às 31 questões antes de enviar.');
  return {
    mega_setor_id: sector.id,
    periodo_id: period.id,
    respostas: questions.map(question => ({
      questao_numero: Number(question.id.slice(1)),
      alternativa: answers[question.id],
    })),
  };
}
