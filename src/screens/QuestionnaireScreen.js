import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import QuestionCard from '../components/QuestionCard';
import { questions } from '../data/questions';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';

export default function QuestionnaireScreen() {
  const { scale, textScale } = useScreenMetrics();
  const { questionId, fromReview } = useLocalSearchParams();
  const { answers, currentIndex, setCurrentIndex, selectAnswer: saveAnswer, resetAnswers } = useQuestionnaire();
  const editing = fromReview === 'true';
  const requestedIndex = questions.findIndex(item => item.id === questionId);
  const activeIndex = editing ? Math.max(0, requestedIndex) : currentIndex;
  const question = questions[activeIndex];
  const { run, open } = useFlowNavigation(`${editing ? 'edit' : 'question'}:${question.id}`);
  const currentNumber = activeIndex + 1;
  const remaining = questions.length - currentNumber;
  const isLast = currentNumber === questions.length;
  const selectedAnswer = answers[question.id];

  /** @param {string} answer */
  const selectAnswer = answer => {
    saveAnswer(question.id, answer);
  };
  const returnToReview = () => {
    router.dismissTo('/review');
  };
  const advance = () => {
    if (!selectedAnswer) return;
    run(() => {
      if (editing) returnToReview();
      else if (isLast) open('/review');
      else setCurrentIndex(currentIndex + 1);
    });
  };
  const goBack = () => {
    run(() => {
      if (editing) { returnToReview(); return; }
      if (currentIndex > 0) setCurrentIndex(index => Math.max(0, index - 1));
      else router.dismissTo('/questionnaire-guidance');
    });
  };

  return (
    // Remonta só o layout para iniciar cada questão no topo da rolagem.
    <ScreenLayout plain fill key={question.id}>
      <Text style={[local.progressHeader, { fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>
        <Text style={local.counter}>Questão {currentNumber}</Text> de {questions.length} - {remaining === 1 ? 'falta 1' : `faltam ${remaining}`}
      </Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Progresso do questionário"
        accessibilityValue={{ min: 1, max: questions.length, now: currentNumber, text: `Questão ${currentNumber} de ${questions.length}` }}
        style={local.track}>
        <View style={[local.fill, { width: `${currentNumber / questions.length * 100}%` }]} />
      </View>
      <QuestionCard question={question} selectedAnswer={selectedAnswer} onSelect={selectAnswer} />
      <View style={local.spacer} />
      <View style={[local.navigation, { marginTop: 48 * scale, gap: 20 * scale }]}>
        <View style={local.navigationButton}>
          <ScreenButton label={editing ? 'Voltar à revisão' : 'Voltar'} onPress={goBack} outlined secondary arrow="left" scale={scale} textScale={textScale} />
        </View>
        <View style={local.navigationButton}>
          <ScreenButton label={editing ? 'Concluir correção' : isLast ? 'Revisar respostas' : 'Avançar'} disabled={!selectedAnswer} onPress={advance}
            arrow="right" scale={scale} textScale={textScale} />
        </View>
      </View>
      {editing && <Text style={[local.notice, { fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>A alteração é guardada ao selecionar uma alternativa. Volte à revisão para conferir.</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => run(() => { resetAnswers(); router.dismissTo('/'); })} style={local.close}>
        <Text style={[local.closeText, { fontSize: 14 * textScale, lineHeight: 19 * textScale }]}>Fechar</Text>
      </Pressable>
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  progressHeader: { width: '100%', color: '#101010' },
  counter: { color: '#101010', fontWeight: 'bold' },
  track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: '#D9D9D9', marginTop: 4, marginBottom: 20, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#20465A' },
  notice: { width: '100%', padding: 16, marginTop: 16, borderRadius: 12, color: '#20465A', backgroundColor: '#C9DFEF' },
  spacer: { flexGrow: 1 },
  navigation: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationButton: { flex: 1, maxWidth: '50%' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 30 },
  closeText: { color: '#20465A', textDecorationLine: 'underline' },
});
