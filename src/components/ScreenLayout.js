import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './screenStyles';

export function useScreenMetrics() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = Math.max(0, Math.min(width, 430) - insets.left - insets.right) / 402;
  return { height, insets, scale, textScale: Math.max(1, scale) };
}

/** @param {{ children: import('react').ReactNode, beforeStart?: boolean, plain?: boolean, fill?: boolean }} props */
export default function ScreenLayout({ children, beforeStart = false, plain = false, fill = false }) {
  const { height, insets, scale } = useScreenMetrics();
  return (
    <View style={styles.background}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.scrollContent}>
            <View style={[styles.canvas, { minHeight: Math.max(0, height - insets.top) }]}>
              {/* Fundo decorativo sem receber toques ou foco de acessibilidade. */}
              {!plain && <View
                pointerEvents="none"
                accessible={false}
                aria-hidden={true}
                style={styles.decoration}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={[styles.lightCircle, {
                  width: (beforeStart ? 600 : 370) * scale,
                  height: (beforeStart ? 600 : 370) * scale,
                  left: (beforeStart ? -115 : -78) * scale,
                  bottom: (beforeStart ? -250 : -193) * scale,
                }]} />
                <View style={[styles.darkCircle, {
                  width: 370 * scale,
                  height: 370 * scale,
                  left: 124 * scale,
                  bottom: -239 * scale,
                }]} />
              </View>}

              <View style={[styles.content, {
                // Permite distribuir o conteúdo e os controles pela altura útil.
                minHeight: fill ? Math.max(0, height - insets.top) : undefined,
                paddingHorizontal: 34 * scale,
                // O SafeAreaView já aplica o recuo superior: não o contamos duas vezes.
                paddingTop: Math.max(12, 70 * scale - insets.top),
                // Protege os controles; o fundo pode ocupar a área inferior do aparelho.
                paddingBottom: plain ? insets.bottom + 24 : Math.max(193 * scale, insets.bottom + 32),
              }]}>
                {children}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}
