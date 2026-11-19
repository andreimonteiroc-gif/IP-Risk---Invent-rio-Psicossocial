import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { styles } from '../components/screenStyles';
import { colors } from '../theme/colors';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';

const guidance = [
  { icon: 'clipboard', title: 'São 31 questões no total.', text: 'Não há resposta certa ou errada. O importante é a sua percepção.' },
  { icon: '↻', title: 'Você pode voltar e revisar sua resposta.', text: 'Assim, se quiser, pode conferir ou mudar alguma resposta.' },
  { icon: 'clock', text: 'As questões sobre saúde e bem-estar se referem às últimas quatro semanas.' },
];

export default function QuestionnaireGuidanceScreen() {
  const { answers, resetAnswers, resetParticipation, submissionLocked } = useQuestionnaire();
  const { run, open } = useFlowNavigation();
  const hasAnswers = Object.keys(answers).length > 0;
  const { scale, textScale } = useScreenMetrics();
  const body = { fontSize: 16 * textScale, lineHeight: 19 * textScale };

  if (submissionLocked) return (
    <ScreenLayout plain backgroundColor={colors.white}>
      <Text style={[body, { color: colors.text }]}>Há uma tentativa de envio em andamento ou já confirmada.</Text>
      <ScreenButton label="Voltar à revisão" brand scale={scale} textScale={textScale} onPress={() => run(() => router.dismissTo('/review'))} />
    </ScreenLayout>
  );

  return (
    <ScreenLayout plain backgroundColor={colors.white}>
      {/* Reservado para o asset do Figma: pessoa azul com pontos de interrogação.
          A ilustração não está disponível nos assets locais. */}
      <View accessible={false} aria-hidden style={{ height: 150 * scale }} />
      <Text accessibilityRole="header" style={[styles.title, {
        color: colors.text, maxWidth: 290 * scale, marginTop: 16 * scale, fontSize: 24 * textScale, lineHeight: 29 * textScale,
      }]}>Como funciona o questionário?</Text>
      <View style={[local.cards, { marginTop: 44 * scale, gap: 26 * scale }]}>
        {guidance.map(item => (
          <View key={item.icon} style={local.card}>
            <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={local.iconTile}>
              {item.icon === 'clipboard' ? <View style={local.clipboard}>
                <View style={local.clip} />
                {[0, 1, 2].map(row => <View key={row} style={[local.clipboardLine, { top: 9 + row * 7 }]} />)}
              </View> : item.icon === 'clock' ? <View style={local.clock}><View style={local.hour} /><View style={local.minute} /></View>
                : <Text style={local.icon}>{item.icon}</Text>}
            </View>
            <Text style={[body, local.cardText]}>
              {item.title && <Text style={local.bold}>{item.title}{'\n'}</Text>}
              {item.text}
            </Text>
          </View>
        ))}
      </View>
      <ScreenButton label={hasAnswers ? 'Retomar questionário' : 'Iniciar questionário'} brand onPress={() => run(() => open('/questionnaire', { fromReview: 'false' }))}
        scale={scale} textScale={textScale} marginTop={60 * scale} />
      {hasAnswers && <ScreenButton label="Iniciar nova participação (apagar respostas)" brand outlined secondary
        onPress={() => run(() => { resetAnswers(); open('/questionnaire', { fromReview: 'false' }); })}
        scale={scale} textScale={textScale} marginTop={12 * scale} />}
      <ScreenButton label="Voltar" brand outlined secondary
        onPress={() => run(() => router.dismissTo('/sector'))}
        scale={scale} textScale={textScale} marginTop={12 * scale} />
      <ScreenButton label="Fechar" brand outlined secondary onPress={() => run(() => { resetParticipation(); router.dismissTo('/'); })}
        scale={scale} textScale={textScale} marginTop={12 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  cards: { width: '100%' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  cardText: { flex: 1, color: colors.textMuted },
  bold: { fontWeight: 'bold', color: colors.text },
  iconTile: { width: 58, minHeight: 64, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 42, lineHeight: 50, color: colors.white },
  clipboard: { width: 28, height: 34, borderRadius: 4, borderWidth: 3, borderColor: colors.white },
  clip: { position: 'absolute', top: -6, left: 5, width: 12, height: 8, borderRadius: 3, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.primary },
  clipboardLine: { position: 'absolute', left: 4, width: 14, height: 2, backgroundColor: colors.white },
  clock: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: colors.white },
  hour: { position: 'absolute', left: 13, top: 4, width: 3, height: 12, borderRadius: 2, backgroundColor: colors.white },
  minute: { position: 'absolute', left: 13, top: 13, width: 10, height: 3, borderRadius: 2, backgroundColor: colors.white, transform: [{ rotate: '25deg' }] },
});
