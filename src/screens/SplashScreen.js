import React, { useCallback, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';

/**
 * @param {{
 *   onFinish?: () => void,
 *   autoTransition?: boolean,
 *   durationMs?: number,
 *   standalone?: boolean
 * }} props
 */
export default function SplashScreen({
  onFinish,
  autoTransition = true,
  durationMs = 2000,
  standalone = false,
} = {}) {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  const [spinValue] = useState(() => (Animated ? new Animated.Value(0) : null));

  // No Expo/React Native, executa no ciclo de vida e no foco da rota
  const runEffect = typeof React.useEffect === 'function' ? React.useEffect : useFocusEffect;

  runEffect(
    useCallback(() => {
      if (spinValue && Animated && Easing) {
        const animation = Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        animation.start();
        return () => animation.stop();
      }
    }, [spinValue])
  );

  runEffect(
    useCallback(() => {
      if (!autoTransition || !onFinish) return;
      const timer = setTimeout(() => {
        onFinish();
      }, durationMs);
      return () => clearTimeout(timer);
    }, [autoTransition, durationMs, onFinish])
  );

  const spin = spinValue
    ? spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      })
    : '0deg';

  const AnimatedView = Animated?.View || View;

  let gradientSource = null;
  let logoSource = null;
  try {
    gradientSource = require('../../assets/splash-gradient.png');
  } catch {
    gradientSource = null;
  }
  try {
    logoSource = require('../../assets/ip-risk-logo.png');
  } catch {
    logoSource = null;
  }

  const isWeb = Platform?.OS === 'web';
  const webStyle = isWeb
    ? /** @type {any} */ ({
        backgroundImage:
          'linear-gradient(180deg, #0E5E4D 0%, #083D31 50%, #04221B 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      })
    : null;

  return (
    <Pressable
      style={[
        styles.container,
        !standalone && styles.overlay,
        webStyle,
      ]}
      onPress={() => onFinish?.()}
      accessibilityRole="none"
      accessibilityLabel="Tela de inicialização"
    >
      <StatusBar barStyle="light-content" />

      {/* Em mobile nativo (Android/iOS), renderiza o asset de degradê ocupando 100% da tela */}
      {!isWeb && gradientSource && (
        <Image
          source={gradientSource}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
          accessible={false}
          aria-hidden
        />
      )}

      {/* Conteúdo centralizado proporcional ao protótipo */}
      <View style={[styles.content, { maxWidth: 430 }]}>
        {/* Card branco centralizado com a logo oficial IP RISK */}
        <View
          style={[
            styles.logoCard,
            {
              borderRadius: 28 * scale,
              paddingHorizontal: 28 * scale,
              paddingVertical: 24 * scale,
            },
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Logotipo Inventário Psicométrico"
        >
          {logoSource ? (
            <Image
              source={logoSource}
              style={{ width: 220 * scale, height: 120 * scale }}
              resizeMode="contain"
              accessible={false}
            />
          ) : (
            <Text
              style={[
                styles.logoText,
                {
                  fontSize: 26 * textScale,
                  lineHeight: 30 * textScale,
                },
              ]}
            >
              LOGO
            </Text>
          )}
        </View>

        {/* Texto descritivo institucional em caixa alta */}
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            {
              marginTop: 20 * scale,
              fontSize: 13 * textScale,
              lineHeight: 18 * textScale,
              letterSpacing: 1.2 * scale,
            },
          ]}
        >
          INVENTÁRIO PSICOMÉTRICO DE{'\n'}RISCOS PSICOSSOCIAIS
        </Text>

        {/* Indicador circular animado em verde-limão */}
        <View
          style={[
            styles.loaderWrapper,
            {
              marginTop: 40 * scale,
              width: 42 * scale,
              height: 42 * scale,
            },
          ]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Carregando..."
        >
          <AnimatedView
            style={[
              styles.loaderArc,
              {
                width: 42 * scale,
                height: 42 * scale,
                borderRadius: 21 * scale,
                borderWidth: 4 * scale,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E533A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  logoCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
    boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.16)',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#2E533A',
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderArc: {
    borderColor: '#A5FF52',
    borderLeftColor: 'transparent',
    borderBottomColor: '#A5FF52',
    borderRightColor: '#A5FF52',
    borderTopColor: '#A5FF52',
  },
});
