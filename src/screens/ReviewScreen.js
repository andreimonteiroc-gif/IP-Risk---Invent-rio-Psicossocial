import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import ReviewBlock from '../components/ReviewBlock';
import { questions } from '../data/questions';
import { countAnswers, isQuestionnaireComplete, questionBlocks } from '../data/questionnaireReview';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';

export default function ReviewScreen() {
  const { scale, textScale } = useScreenMetrics();
  const { answers, resetAnswers } = useQuestionnaire();
  const { run } = useFlowNavigation();
  const [expanded, setExpanded] = useState(/** @type {Record<string, boolean>} */ ({}));
  const answered = countAnswers(questions, answers);
  const complete = isQuestionnaireComplete(answers);
  const body = { fontSize: 16 * textScale, lineHeight: 22 * textScale };

  return (
    <ScreenLayout plain fill>
      <Text accessibilityRole="header" style={[local.title, { fontSize: 24 * textScale, lineHeight: 30 * textScale }]}>Revisão das respostas</Text>
      <Text style={[body, local.description]}>Confira suas respostas. Toque em um bloco para abrir e em uma questão para corrigir.</Text>
      <Text accessibilityLiveRegion="polite" style={[body, local.summary]}>{answered} de {questions.length} questões respondidas</Text>
      <View style={local.blocks}>
        {questionBlocks.map(block => (
          <ReviewBlock key={block.title} block={block} answers={answers} expanded={!!expanded[block.title]}
            onToggle={() => setExpanded(previous => ({ ...previous, [block.title]: !previous[block.title] }))}
            onEdit={id => run(() => router.push({ pathname: '/questionnaire', params: { questionId: id, fromReview: 'true' } }))} />
        ))}
      </View>
      {!complete && <Text accessibilityRole="alert" style={[body, local.warning]}>Faltam {questions.length - answered} respostas. Abra os blocos indicados e toque nas questões não respondidas para completar. Um questionário incompleto não pode avançar para a confirmação.</Text>}
      <View style={local.spacer} />
      <Text accessibilityLiveRegion="polite" style={[body, local.description]}>{complete ? 'Todas as questões foram respondidas. ' : ''}A confirmação e o envio serão disponibilizados em uma próxima etapa.</Text>
      {/* Sem callback: a etapa futura permanece indisponível mesmo com 31 respostas. */}
      <ScreenButton label="Continuar para confirmação" disabled scale={scale} textScale={textScale} marginTop={16} />
      <ScreenButton label="Voltar ao questionário" outlined secondary scale={scale} textScale={textScale} marginTop={12}
        onPress={() => run(() => router.dismissTo({ pathname: '/questionnaire', params: { fromReview: 'false' } }))} />
      <ScreenButton label="Fechar" outlined secondary scale={scale} textScale={textScale} marginTop={12}
        onPress={() => run(() => { resetAnswers(); router.dismissTo('/'); })} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  title: { alignSelf: 'stretch', fontWeight: 'bold', color: '#172747' },
  description: { alignSelf: 'stretch', color: '#4A5665', marginTop: 12 },
  summary: { alignSelf: 'stretch', color: '#20465A', marginVertical: 20, fontWeight: 'bold' },
  blocks: { width: '100%', gap: 14 },
  warning: { width: '100%', marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#FFF0DC', color: '#854500' },
  spacer: { flexGrow: 1, minHeight: 20 },
});
