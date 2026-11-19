import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';
import useSubmissionFlow from '../hooks/useSubmissionFlow';

export default function SubmissionErrorScreen() {
  const { scale, textScale } = useScreenMetrics();
  const { submissionError } = useQuestionnaire();
  const { run } = useFlowNavigation('submission-error');
  const retry = useSubmissionFlow();

  return (
    <ScreenLayout plain fill>
      <View accessible={false} aria-hidden style={[local.iconCircle, { width: 112 * scale, height: 112 * scale, borderRadius: 56 * scale }]}>
        <Text style={{ color: '#FFFFFF', fontSize: 58 * textScale, lineHeight: 68 * textScale }}>⌁</Text>
      </View>
      <Text accessibilityRole="header" style={[local.title, { marginTop: 14 * scale, fontSize: 18 * textScale, lineHeight: 23 * textScale }]}>Não conseguimos enviar.</Text>
      <Text accessibilityRole="alert" style={[local.description, { marginTop: 18 * scale, fontSize: 14 * textScale, lineHeight: 18 * textScale }]}>
        {submissionError || 'Suas respostas continuam nesta etapa. Tente novamente para confirmar o envio.'}
      </Text>
      <View style={local.spacer} />
      <ScreenButton label="Tentar novamente" onPress={retry} scale={scale} textScale={textScale} />
      <ScreenButton label="Voltar à revisão" outlined secondary onPress={() => run(() => router.dismissTo('/review'))}
        scale={scale} textScale={textScale} marginTop={12 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  iconCircle: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B6085', marginTop: 50 },
  title: { width: '100%', textAlign: 'center', fontWeight: 'bold', color: '#101010' },
  description: { maxWidth: 280, alignSelf: 'center', textAlign: 'center', color: '#101010' },
  spacer: { flexGrow: 1, minHeight: 32 },
});
