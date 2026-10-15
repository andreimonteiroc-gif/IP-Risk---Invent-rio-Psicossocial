import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { styles } from '../components/screenStyles';

export default function RefusalScreen() {
  const { scale, textScale } = useScreenMetrics();
  const body = { fontSize: 16 * textScale, lineHeight: 19 * textScale };
  return (
    <ScreenLayout>
      <Image source={require('../../assets/Frame.png')} resizeMode="contain"
        accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ width: 200 * scale, height: 200 * scale * 422 / 508, marginTop: 4 * scale }} />
      <Text accessibilityRole="header" style={[styles.title, {
        maxWidth: 270 * scale, marginTop: 28 * scale, fontSize: 23 * textScale, lineHeight: 28 * textScale,
      }]}>Obrigado pela sua atenção!</Text>
      <Text style={[local.message, body, { marginTop: 16 * scale }]}>
        Sua decisão é muito importante. Respeitamos o seu tempo e sua escolha.
      </Text>
      <View style={[local.card, { marginTop: 48 * scale }]}>
        <Text accessible={false} aria-hidden style={local.info}>ⓘ</Text>
        <Text style={[body, local.cardText]}>Nenhuma resposta foi registrada. Você pode voltar ao termo para reconsiderar sua decisão.</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao termo"
        onPress={() => router.canGoBack() ? router.back() : router.replace('/tcle')}
        style={[local.returnButton, { marginTop: 24 * scale }]}>
        <Text style={[body, local.returnText]}>←  Voltar ao termo</Text>
      </Pressable>
      <ScreenButton label="Fechar" onPress={() => router.dismissTo('/')} scale={scale} textScale={textScale} marginTop={24 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  message: { textAlign: 'center', color: '#101010', maxWidth: 280 },
  card: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, backgroundColor: '#C9DFEF' },
  cardText: { flex: 1, color: '#101010' },
  info: { fontSize: 22, color: '#20465A' },
  returnButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  returnText: { color: '#2539B4' },
});
