import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { questions } from '../data/questions';
import { toSubmission } from '../data/submission';
import { api, ApiError } from '../services/api';
import { saveCompletedPeriod } from '../services/participationStorage';

/** @typedef {{ answers: import('../data/questionnaireReview').Answers, currentIndex: number, setCurrentIndex: import('react').Dispatch<import('react').SetStateAction<number>>, selectAnswer: (id: string, answer: string) => void, resetAnswers: () => void,
 * resetParticipation: () => void, sector: import('../services/api').MegaSector | null, period: import('../services/api').Period | null,
 * selectCollection: (sector: import('../services/api').MegaSector | null, period: import('../services/api').Period | null) => void,
 * refreshCollection: (sectors: import('../services/api').MegaSector[], period: import('../services/api').Period) => void,
 * idempotencyKey: string, submissionStatus: string, submissionError: string, submissionLocked: boolean, submittedAt: string | null, submit: () => Promise<boolean> }} QuestionnaireState */
const QuestionnaireContext = createContext(/** @type {QuestionnaireState | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function QuestionnaireProvider({ children }) {
  // Vive acima das rotas: desmontar uma tela não apaga as demais respostas.
  // Não grava dados sensíveis em disco nem os coloca nos parâmetros da URL.
  const [answers, setAnswers] = useState(/** @type {import('../data/questionnaireReview').Answers} */ ({}));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sector, setSector] = useState(/** @type {import('../services/api').MegaSector | null} */ (null));
  const [period, setPeriod] = useState(/** @type {import('../services/api').Period | null} */ (null));
  const [submissionStatus, setSubmissionStatus] = useState('idle');
  const [submissionError, setSubmissionError] = useState('');
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(/** @type {string | null} */ (null));
  const attempt = useRef(/** @type {{key: string, body: import('../services/api').Submission} | null} */ (null));
  const idempotencyKeyRef = useRef(randomUUID());
  const sending = useRef(false);
  const succeeded = useRef(false);
  /** @param {string} id @param {string} answer */
  const selectAnswer = (id, answer) => {
    if (attempt.current || sending.current || succeeded.current) return;
    const question = questions.find(item => item.id === id);
    if (!question?.alternatives.includes(answer)) return;
    setAnswers(previous => ({ ...previous, [id]: answer }));
  };
  const resetAnswers = () => {
    if (sending.current) return;
    setAnswers({}); setCurrentIndex(0);
    attempt.current = null; succeeded.current = false;
    idempotencyKeyRef.current = randomUUID();
    setSubmissionLocked(false);
    setSubmittedAt(null);
    setSubmissionStatus('idle'); setSubmissionError('');
  };
  const resetParticipation = () => {
    if (sending.current) return;
    resetAnswers(); setSector(null); setPeriod(null);
  };
  /** @param {import('../services/api').MegaSector | null} nextSector @param {import('../services/api').Period | null} nextPeriod */
  const selectCollection = useCallback((/** @type {import('../services/api').MegaSector | null} */ nextSector, /** @type {import('../services/api').Period | null} */ nextPeriod) => {
    if (attempt.current || sending.current || succeeded.current) return;
    setSector(nextSector); setPeriod(nextPeriod);
  }, []);
  const refreshCollection = useCallback((/** @type {import('../services/api').MegaSector[]} */ sectors, /** @type {import('../services/api').Period} */ nextPeriod) => {
    if (attempt.current || sending.current || succeeded.current) return;
    setSector(current => sectors.find(item => item.id === current?.id) || null);
    setPeriod(nextPeriod);
  }, []);
  const submit = async () => {
    // A ref trava imediatamente, inclusive antes de um rerender por duplo toque.
    if (sending.current || succeeded.current) return succeeded.current;
    sending.current = true;
    setSubmissionError('');
    try {
      if (!attempt.current) {
        const body = toSubmission(answers, sector, period);
        attempt.current = { key: idempotencyKeyRef.current, body };
        setSubmissionLocked(true);
      }
      setSubmissionStatus('sending');
      const data = await api.submit(attempt.current.body, attempt.current.key);
      const timestamp = data?.enviado_em || data?.data_envio || data?.created_at || data?.timestamp || new Date().toISOString();
      succeeded.current = true;
      if (period?.id) {
        saveCompletedPeriod(period.id, timestamp);
      }
      setSubmittedAt(timestamp);
      setSubmissionStatus('success');
      return true;
    } catch (error) {
      // Somente uma rejeição explícita anterior à gravação libera correções.
      // Timeout/500/resposta inválida preservam a chave e o snapshot para reenvio.
      if (error instanceof ApiError && error.definitive) {
        attempt.current = null;
        idempotencyKeyRef.current = randomUUID();
        setSubmissionLocked(false);
      }
      setSubmissionError(error instanceof Error ? error.message : 'Não foi possível confirmar o envio.');
      setSubmissionStatus('error');
      return false;
    } finally {
      sending.current = false;
    }
  };

  return <QuestionnaireContext.Provider value={{ answers, currentIndex, setCurrentIndex, selectAnswer, resetAnswers,
    resetParticipation, sector, period, selectCollection, refreshCollection, idempotencyKey: idempotencyKeyRef.current,
    submissionStatus, submissionError, submissionLocked, submittedAt, submit }}>{children}</QuestionnaireContext.Provider>;
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (!context) throw new Error('useQuestionnaire deve estar dentro de QuestionnaireProvider');
  return context;
}
