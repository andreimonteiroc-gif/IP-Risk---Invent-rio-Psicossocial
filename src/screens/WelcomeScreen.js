import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { styles } from '../components/screenStyles';

export default function WelcomeScreen() {
  const { scale, textScale } = useScreenMetrics();
  const illustrationWidth = 236 * scale;
  return (
    <ScreenLayout>
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
        source={require('../../assets/Frame.png')}
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
      <ScreenButton label={'Começar'} onPress={() => router.push('/before-start')} scale={scale} textScale={textScale} marginTop={39 * scale} />

    </ScreenLayout>
  );
}
