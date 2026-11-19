import { router } from 'expo-router';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from './useFlowNavigation';

export default function useSubmissionFlow() {
  const { submit } = useQuestionnaire();
  const { run } = useFlowNavigation('submission-action');

  return () => run(() => {
    const result = submit();
    router.replace('/submission-sending');
    result.then(succeeded => router.replace(succeeded ? '/submission-success' : '/submission-error'));
  });
}
