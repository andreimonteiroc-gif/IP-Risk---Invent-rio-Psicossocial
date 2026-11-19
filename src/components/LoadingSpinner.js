import React, { useCallback, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '../theme/colors';

/** Spinner circular animado (mesmo mecanismo da Splash), em verde claro do Protótipo 2.
 * @param {{ size?: number }} props */
export default function LoadingSpinner({ size = 56 } = {}) {
  const [spinValue] = useState(() => (Animated ? new Animated.Value(0) : null));
  const runEffect = typeof React.useEffect === 'function' ? React.useEffect : useFocusEffect;

  runEffect(
    useCallback(() => {
      if (spinValue && Animated && Easing) {
        const animation = Animated.loop(
          Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
        );
        animation.start();
        return () => animation.stop();
      }
    }, [spinValue])
  );

  const spin = spinValue ? spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  const AnimatedView = Animated?.View || View;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Enviando..." style={{ width: size, height: size }}>
      <AnimatedView style={[local.arc, {
        width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(3, size / 12),
        transform: [{ rotate: spin }],
      }]} />
    </View>
  );
}

const local = StyleSheet.create({
  arc: { borderColor: colors.accent, borderLeftColor: 'transparent' },
});
