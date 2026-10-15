import { StatusBar } from 'expo-status-bar';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Medidas de referência do frame do Figma: 402 × 874.
const FRAME_WIDTH = 402;
export default function App() {
  return (
    <SafeAreaProvider>
      <WelcomeScreen />
    </SafeAreaProvider>
  );
}

function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const screenWidth = Math.max(0, Math.min(width, 430) - insets.left - insets.right);
  const scale = screenWidth / FRAME_WIDTH;
  // Escala os elementos visuais, mas não reduz as fontes abaixo do original.
  const textScale = Math.max(1, scale);
  const illustrationWidth = 236 * scale;

  return (
    <View style={styles.background}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.scrollContent}>
            <View style={[styles.canvas, { minHeight: Math.max(0, height - insets.top) }]}>
              {/* Fundo decorativo sem receber toques ou foco de acessibilidade. */}
              <View
                pointerEvents="none"
                accessible={false}
                aria-hidden={true}
                style={styles.decoration}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={[styles.lightCircle, {
                  width: 370 * scale,
                  height: 370 * scale,
                  left: -78 * scale,
                  bottom: -193 * scale,
                }]} />
                <View style={[styles.darkCircle, {
                  width: 370 * scale,
                  height: 370 * scale,
                  left: 124 * scale,
                  bottom: -239 * scale,
                }]} />
              </View>

              <View style={[styles.content, {
                paddingHorizontal: 34 * scale,
                // O SafeAreaView já aplica o recuo superior: não o contamos duas vezes.
                paddingTop: Math.max(12, 70 * scale - insets.top),
                // Protege os controles; o fundo pode ocupar a área inferior do aparelho.
                paddingBottom: Math.max(193 * scale, insets.bottom + 32),
              }]}>
                <Pressable
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel="Informações sobre a pesquisa"
                  style={styles.infoButton}
                >
                  <View style={styles.infoCircle}>
                    <Text style={styles.infoText}>i</Text>
                  </View>
                </Pressable>

                <Text accessibilityRole="header" style={[styles.title, {
                  marginTop: 20 * scale,
                  fontSize: 23 * textScale,
                  lineHeight: 28 * textScale,
                }]}>
                  Riscos Psicossociais
                </Text>
                <Text style={[styles.subtitle, {
                  marginTop: 18 * scale,
                  fontSize: 16 * textScale,
                  lineHeight: 19 * textScale,
                }]}>
                  Juntos por um ambiente{'\n'}de trabalho mais saudável
                </Text>

                <Image
                  source={require('./assets/Frame.png')}
                  style={{
                    width: illustrationWidth,
                    height: illustrationWidth * 422 / 508,
                    marginTop: 34 * scale,
                  }}
                  resizeMode="contain"
                  accessible={false}
                  aria-hidden={true}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />

                <Text style={[styles.description, {
                  width: 244 * scale,
                  marginTop: 40 * scale,
                  fontSize: 16 * textScale,
                  lineHeight: 19 * textScale,
                }]}>
                  Sua participação é importante para identificar possíveis riscos psicossociais e melhorar as condições de trabalho na nossa instituição.
                </Text>

                {/* Sem navegação nesta etapa. */}
                <Pressable
                  disabled
                  accessibilityRole="button"
                  accessibilityLabel="Começar"
                  style={[styles.startButton, {
                    marginTop: 39 * scale,
                    minHeight: Math.max(44, 44 * scale),
                  }]}
                >
                  <Text style={[styles.startButtonText, {
                    fontSize: 20 * textScale,
                    lineHeight: 24 * textScale,
                  }]}>Começar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#EAF3F8', alignItems: 'center' },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: '#EAF3F8',
  },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  canvas: { flexGrow: 1, overflow: 'hidden' },
  content: { alignItems: 'center', zIndex: 1 },
  // No RN 0.86, absoluteFill mantém a camada com a mesma área do canvas.
  decoration: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  lightCircle: { position: 'absolute', borderRadius: 999, backgroundColor: '#C9DFEF' },
  darkCircle: { position: 'absolute', borderRadius: 999, backgroundColor: '#2B6085' },
  infoButton: { alignSelf: 'flex-start', width: 44, minHeight: 44, justifyContent: 'center' },
  infoCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#15242B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { fontSize: 13, lineHeight: 16, fontWeight: 'bold', color: '#15242B' },
  title: { fontWeight: 'bold', textAlign: 'center', color: '#101010' },
  subtitle: { textAlign: 'center', color: '#101010' },
  description: { maxWidth: '100%', textAlign: 'center', color: '#101010' },
  startButton: {
    width: '100%',
    minWidth: 44,
    borderRadius: 24,
    backgroundColor: '#20465A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    boxShadow: '0px 3px 4px rgba(0, 0, 0, 0.25)',
  },
  startButtonText: { color: '#FFFFFF', textAlign: 'center' },
});
