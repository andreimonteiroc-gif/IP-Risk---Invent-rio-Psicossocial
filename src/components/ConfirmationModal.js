import { StyleSheet, Text, View } from 'react-native';
import { useScreenMetrics } from './ScreenLayout';
import AppHeader from './AppHeader';
import { colors } from '../theme/colors';

/** Modal centralizado sobre fundo escurecido, compartilhado por Confirmação e Envio.
 * @param {{ children?: import('react').ReactNode }} props */
export default function ConfirmationModal({ children }) {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  return (
    <View style={local.root}>
      <View style={local.frame}>
        <AppHeader />
        <View style={local.backdrop} />
        <View style={[local.overlay, { paddingHorizontal: 24 * scale }]}>
          <View style={[local.card, { borderRadius: 24 * scale, padding: 24 * scale }]}>
            <Text accessibilityRole="header" style={[local.title, { fontSize: 20 * textScale, lineHeight: 26 * textScale }]}>
              Confirmar envio das respostas?
            </Text>
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Ilustração central em #2E533A e #92E3A9, desenhada com Views. */
export function ConfirmIllustration() {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  const size = 112 * scale;
  return (
    <View accessible={false} aria-hidden style={[local.illusOuter, { width: size, height: size, borderRadius: size / 2, marginTop: 16 * scale }]}>
      <View style={[local.illusInner, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.16 }]}>
        <Text style={[local.illusCheck, { fontSize: 34 * textScale, lineHeight: 40 * textScale }]}>✓</Text>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.white },
  backdrop: { flex: 1, backgroundColor: colors.white },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', top: 0 },
  card: { width: '100%', backgroundColor: colors.white, alignItems: 'center', boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.25)' },
  title: { textAlign: 'center', fontWeight: 'bold', color: colors.text },
  illusOuter: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  illusInner: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  illusCheck: { color: colors.white, fontWeight: 'bold' },
});
