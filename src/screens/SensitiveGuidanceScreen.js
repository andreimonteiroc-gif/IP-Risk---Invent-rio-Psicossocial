import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { colors } from '../theme/colors';
import useFlowNavigation from '../hooks/useFlowNavigation';
import { useQuestionnaire } from '../state/QuestionnaireContext';

export default function SensitiveGuidanceScreen() {
  const { scale, textScale } = useScreenMetrics();
  const { setCurrentIndex, submissionLocked } = useQuestionnaire();
  const { run, open } = useFlowNavigation('sensitive-guidance');

  if (submissionLocked) return (
    <ScreenLayout plain backgroundColor={colors.white}>
      <Text style={{ color: colors.text }}>As respostas pertencem a uma tentativa de envio. Volte à revisão para consultar a confirmação.</Text>
      <ScreenButton label="Voltar à revisão" brand scale={scale} textScale={textScale} onPress={() => run(() => router.dismissTo('/review'))} />
    </ScreenLayout>
  );

  return (
    <ScreenLayout plain fill backgroundColor={colors.white}>
      <View accessible={false} aria-hidden style={[local.iconCircle, { width: 144 * scale, height: 144 * scale, borderRadius: 72 * scale, marginTop: 12 * scale }]}>
        <View style={[local.triangleOuter, {
          borderLeftWidth: 37 * scale, borderRightWidth: 37 * scale, borderBottomWidth: 65 * scale,
        }]}>
          <View style={[local.triangleInner, {
            top: 11 * scale, borderLeftWidth: 29 * scale, borderRightWidth: 29 * scale, borderBottomWidth: 51 * scale,
          }]} />
          <Text style={[local.exclamation, { top: 25 * scale, fontSize: 34 * textScale, lineHeight: 38 * textScale }]}>!</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={[local.title, { marginTop: 18 * scale, fontSize: 20 * textScale, lineHeight: 26 * textScale }]}>Perguntas sensíveis</Text>
      <Text style={[local.description, { marginTop: 18 * scale, fontSize: 16 * textScale, lineHeight: 19 * textScale }]}>
        As próximas perguntas tratam de situações difíceis no trabalho. Suas respostas serão consideradas nos resultados coletivos. Você verá uma pergunta por vez.
      </Text>
      <View style={local.spacer} />
      <ScreenButton label="Entendi, continuar" brand onPress={() => run(() => {
        setCurrentIndex(27);
        open('/questionnaire', { fromReview: 'false' });
      })} scale={scale} textScale={textScale} marginTop={48 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  iconCircle: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent,
  },
  triangleOuter: {
    width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.primary,
  },
  triangleInner: {
    position: 'absolute', left: -29, width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.accent,
  },
  exclamation: { position: 'absolute', left: -6, color: colors.primary, fontWeight: 'bold' },
  title: { width: '100%', textAlign: 'center', fontWeight: 'bold', color: colors.text },
  description: { maxWidth: 290, textAlign: 'center', color: colors.textMuted },
  spacer: { flexGrow: 1, minHeight: 24 },
});
