import { useState } from 'react';
import * as RN from 'react-native';
import { router } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';
import ConfirmationModal, { ConfirmIllustration } from '../components/ConfirmationModal';
import { colors } from '../theme/colors';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';
import useSubmissionFlow from '../hooks/useSubmissionFlow';

const { Pressable, StyleSheet, Text } = RN;
const ActivityIndicator = RN.ActivityIndicator || null;

export const CONFIRMATION_TEXT = 'Suas respostas serão consolidadas de forma definitiva e registradas para o setor informado. Não será possível revisá-las após o envio.';

export default function SubmissionConfirmationScreen() {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  const { answers, submissionLocked, submissionStatus } = useQuestionnaire();
  const { run } = useFlowNavigation('submission-confirmation');
  const send = useSubmissionFlow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sending = submissionStatus === 'sending' || isSubmitting;
  const disabled = submissionLocked || sending || Object.keys(answers).length !== 31;

  return (
    <ConfirmationModal>
      <ConfirmIllustration />
      <Text style={[local.description, { marginTop: 16 * scale, fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>{CONFIRMATION_TEXT}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Confirmar envio" accessibilityState={{ disabled }}
        disabled={disabled} onPress={() => { if (disabled) return; setIsSubmitting(true); send(); }}
        style={[local.primary, { marginTop: 22 * scale, minHeight: Math.max(50, 50 * scale), paddingHorizontal: Math.max(24, 28 * scale) }, disabled && local.primaryDisabled]}>
        {sending && ActivityIndicator ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={[local.primaryText, { fontSize: 15 * textScale }, disabled && local.primaryTextDisabled]}>
            {sending ? 'Enviando...' : 'Sim, confirmar e enviar'}
          </Text>
        )}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Revisar respostas" disabled={sending} onPress={() => run(() => router.back())}
        style={[local.secondary, { marginTop: 8 * scale }]}>
        <Text style={[local.secondaryText, { fontSize: 14 * textScale }]}>Revisar respostas</Text>
      </Pressable>
    </ConfirmationModal>
  );
}

const local = StyleSheet.create({
  description: { textAlign: 'center', color: colors.text },
  primary: { width: '100%', minWidth: 160, alignSelf: 'stretch', borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  primaryDisabled: { backgroundColor: colors.disabledBg },
  primaryText: { color: colors.white, fontWeight: 'bold', textAlign: 'center', flexShrink: 1 },
  primaryTextDisabled: { color: colors.disabledText },
  secondary: { minHeight: 48, minWidth: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  secondaryText: { color: colors.orange, fontWeight: '600', textAlign: 'center' },
});
