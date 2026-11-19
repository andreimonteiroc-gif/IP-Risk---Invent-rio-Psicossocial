import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { colors } from '../theme/colors';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';

/** Formata o timestamp do envio no padrão DD/MM/AAAA às HH:mm.
 * @param {string | null | undefined} value */
function formatSubmissionTimestamp(value) {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  /** @param {number} n */
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Ilustração vetorial leve com Views nativas na paleta #92E3A9 e #2E533A.
 * @param {{ scale: number }} props */
function SuccessIllustration({ scale }) {
  const haloSize = 184 * scale;
  const ringSize = 148 * scale;
  const circleSize = 128 * scale;
  const thumbBox = 64 * scale;
  const border = Math.max(2, 2.5 * scale);

  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[local.illustrationWrap, { width: haloSize, height: haloSize }]}
    >
      <View style={[local.halo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2 }]} />
      <View style={[local.dashedRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: Math.max(1.5, 1.5 * scale) }]} />
      <View style={[local.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, borderWidth: border }]}>
        <View style={{ width: thumbBox, height: thumbBox }}>
          {/* Punho do polegar */}
          <View style={[local.cuff, {
            left: 8 * scale,
            bottom: 10 * scale,
            width: 13 * scale,
            height: 27 * scale,
            borderRadius: 4 * scale,
          }]} />
          {/* Polegar erguido */}
          <View style={[local.thumb, {
            left: 25 * scale,
            top: 6 * scale,
            width: 12 * scale,
            height: 24 * scale,
            borderWidth: border,
            borderTopLeftRadius: 6 * scale,
            borderTopRightRadius: 6 * scale,
          }]} />
          {/* Palma da mão */}
          <View style={[local.palm, {
            left: 23 * scale,
            bottom: 10 * scale,
            width: 31 * scale,
            height: 27 * scale,
            borderWidth: border,
            borderTopLeftRadius: 4 * scale,
            borderBottomLeftRadius: 4 * scale,
            borderTopRightRadius: 8 * scale,
            borderBottomRightRadius: 10 * scale,
          }]}>
            {[0, 1, 2].map(index => (
              <View key={index} style={[local.fingerLine, {
                right: 0,
                top: (6 + index * 7) * scale,
                width: 9 * scale,
                height: Math.max(1.5, 2 * scale),
              }]} />
            ))}
          </View>
        </View>
      </View>
      <View style={[local.dotAccent, { top: 18 * scale, right: 20 * scale, width: 12 * scale, height: 12 * scale, borderRadius: 6 * scale }]} />
      <View style={[local.dotPrimary, { bottom: 22 * scale, left: 16 * scale, width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale }]} />
    </View>
  );
}

export default function SubmissionSuccessScreen() {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  const { resetParticipation, submissionStatus, submittedAt } = useQuestionnaire();
  const { run } = useFlowNavigation('submission-success');

  if (submissionStatus !== 'success') return (
    <ScreenLayout plain backgroundColor={colors.white}>
      <Text accessibilityRole="alert">O envio ainda não foi confirmado.</Text>
      <ScreenButton label="Voltar à revisão" scale={scale} textScale={textScale} onPress={() => run(() => router.dismissTo('/review'))} />
    </ScreenLayout>
  );

  const formattedTimestamp = formatSubmissionTimestamp(submittedAt);

  return (
    <ScreenLayout plain fill backgroundColor={colors.white}>
      <View style={[local.headerBlock, { marginTop: 12 * scale }]}>
        <Text accessibilityRole="header" style={[local.title, { fontSize: 24 * textScale, lineHeight: 30 * textScale }]}>
          Questionário enviado com sucesso!
        </Text>
        <Text style={[local.subtitle, { marginTop: 12 * scale, fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
          Agradecemos sua colaboração. Suas respostas foram salvas com segurança e são fundamentais para o nosso mapeamento.
        </Text>
      </View>

      <View style={local.centerArea}>
        <SuccessIllustration scale={scale} />
      </View>

      <View style={local.footer}>
        <Text style={[local.timestamp, { fontSize: 12 * textScale, lineHeight: 16 * textScale, marginBottom: 16 * scale }]}>
          {`Data de envio: ${formattedTimestamp}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Concluir e Sair"
          onPress={() => run(() => { resetParticipation(); router.dismissTo('/'); })}
          style={[local.finishButton, { minHeight: Math.max(50, 50 * scale), paddingHorizontal: Math.max(24, 28 * scale) }]}
        >
          <Text style={[local.finishButtonText, { fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            Concluir e Sair
          </Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  headerBlock: { width: '100%', alignItems: 'center' },
  title: { maxWidth: 290, textAlign: 'center', fontWeight: 'bold', color: colors.primary },
  subtitle: { maxWidth: 300, textAlign: 'center', color: colors.textMuted },
  centerArea: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  illustrationWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.accent, opacity: 0.28 },
  dashedRing: { position: 'absolute', borderStyle: 'dashed', borderColor: colors.primary, opacity: 0.45 },
  circle: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderColor: colors.primary },
  cuff: { position: 'absolute', backgroundColor: colors.primary },
  thumb: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.primary, transform: [{ rotate: '12deg' }] },
  palm: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.primary },
  fingerLine: { position: 'absolute', backgroundColor: colors.primary },
  dotAccent: { position: 'absolute', backgroundColor: colors.accent },
  dotPrimary: { position: 'absolute', backgroundColor: colors.primary, opacity: 0.5 },
  footer: { width: '100%', alignItems: 'center' },
  timestamp: { textAlign: 'center', color: colors.textMuted },
  finishButton: {
    width: '100%',
    minWidth: 160,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  finishButtonText: { color: colors.white, fontWeight: 'bold', textAlign: 'center', flexShrink: 1 },
});
