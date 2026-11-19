import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';

export default function RefusalScreen() {
  const { scale, textScale, insets } = useScreenMetrics();

  let imageFrame = null;
  try {
    imageFrame = require('../../assets/Frame.png');
  } catch {
    imageFrame = null;
  }

  const body = { fontSize: 14 * textScale, lineHeight: 20 * textScale };

  return (
    <View style={local.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          local.scrollContent,
          {
            paddingTop: Math.max(16, insets?.top || 0),
            paddingBottom: Math.max(24, (insets?.bottom || 0) + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[local.canvas, { maxWidth: 430 }]}>

          {/* Barra superior */}
          <View style={[local.topBar, { paddingHorizontal: 8 * scale, marginBottom: 8 * scale }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar ao termo de consentimento"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/tcle')}
              style={local.backButton}
            >
              <Text style={[local.backArrow, { fontSize: 22 * textScale }]}>←</Text>
            </Pressable>
            <Text style={[local.topBarTitle, { fontSize: 13 * textScale }]}>Termo Consentimento</Text>
          </View>

          {/* Sugestão atenuada da tela anterior */}
          <View style={[local.ghostCard, { marginHorizontal: 20 * scale, marginBottom: -12 * scale, padding: 16 * scale, borderRadius: 16 * scale }]}>
            <Text style={[local.ghostTitle, { fontSize: 18 * textScale, lineHeight: 24 * textScale }]}>Termo de</Text>
            <Text style={[local.ghostTitle, { fontSize: 18 * textScale, lineHeight: 24 * textScale }]}>Consentimento</Text>
            <Text style={[local.ghostText, { fontSize: 11 * textScale, lineHeight: 15 * textScale, marginTop: 6 * scale }]}>
              Antes de começar, precisamos da sua autorização. Sua participação é totalmente
              voluntária e os dados serão tratados com estrita confidencialidade.
            </Text>
          </View>

          {/* Cartão central branco */}
          <View style={[local.card, { borderRadius: 24 * scale, padding: 24 * scale, marginHorizontal: 4 * scale }]}>

            {/* Título */}
            <Text
              accessibilityRole="header"
              style={[local.cardTitle, { fontSize: 20 * textScale, lineHeight: 26 * textScale, marginBottom: 20 * scale }]}
            >
              Deseja realmente sair do aplicativo
            </Text>

            {/* Ilustração */}
            {imageFrame && (
              <Image
                source={imageFrame}
                resizeMode="contain"
                accessible={false}
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ width: 180 * scale, height: 180 * scale * 422 / 508, alignSelf: 'center', marginBottom: 20 * scale }}
              />
            )}

            {/* Texto explicativo */}
            <Text style={[local.cardBody, body, { marginBottom: 28 * scale }]}>
              Você optou por não concordar com os termos. O aceite é obrigatório para concluir
              o cadastro. Se sair agora, nenhum dado pessoal será salvo.
            </Text>

            {/* Botão primário — Sair do Aplicativo */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair do Aplicativo"
              onPress={() => router.dismissTo('/')}
              style={[local.exitButton, { borderRadius: 24 * scale, paddingVertical: 14 * scale, marginBottom: 16 * scale }]}
            >
              <Text style={[local.exitButtonText, { fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
                Sair do Aplicativo
              </Text>
            </Pressable>

            {/* Ação secundária — Voltar ao termo */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar para tela de termo de consentimento"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/tcle')}
              style={local.returnLink}
            >
              <Text style={[local.returnLinkText, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                {'←  Voltar para tela de termo de consentimento'}
              </Text>
            </Pressable>

          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7F8',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    width: '100%',
  },
  canvas: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#4A5665',
  },
  topBarTitle: {
    color: '#4A5665',
    fontWeight: '500',
  },
  ghostCard: {
    width: '100%',
    backgroundColor: '#EAEFF2',
    opacity: 0.6,
  },
  ghostTitle: {
    fontWeight: 'bold',
    color: '#1D5D4F',
  },
  ghostText: {
    color: '#4A5665',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Sombra suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#15242B',
    textAlign: 'center',
  },
  cardBody: {
    color: '#4A5665',
    textAlign: 'center',
  },
  exitButton: {
    width: '100%',
    minWidth: 160,
    minHeight: 50,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
    backgroundColor: '#F25C19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
  returnLink: {
    minHeight: 48,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  returnLinkText: {
    color: '#1D5D4F',
    textAlign: 'center',
  },
});
