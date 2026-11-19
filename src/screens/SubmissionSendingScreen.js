import { StyleSheet, Text } from 'react-native';
import { useScreenMetrics } from '../components/ScreenLayout';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors } from '../theme/colors';

const INFO_TEXT = 'Suas respostas serão consolidadas de forma definitiva e registradas para o setor informado. Não será possível revisá-las após o envio.';

// Estado de carregamento do POST /participacoes: mesmo cartão da confirmação, sem botões.
export default function SubmissionSendingScreen() {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  return (
    <ConfirmationModal>
      <LoadingSpinner size={56 * scale} />
      {/* Anúncio para leitores de tela, sem alterar o visual do Figma. */}
      <Text accessibilityLiveRegion="polite" style={local.srOnly}>Enviando suas respostas...</Text>
      <Text style={[local.description, { marginTop: 20 * scale, fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>{INFO_TEXT}</Text>
    </ConfirmationModal>
  );
}

const local = StyleSheet.create({
  description: { textAlign: 'center', color: colors.text },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
