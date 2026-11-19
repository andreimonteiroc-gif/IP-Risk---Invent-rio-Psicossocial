import { Pressable, Text } from 'react-native';
import { styles } from './screenStyles';

/** @param {{ label: string, displayLabel?: string, accessibilityLabel?: string, onPress?: import('react-native').PressableProps['onPress'], disabled?: boolean, secondary?: boolean, outlined?: boolean, green?: boolean, brand?: boolean, scale: number, textScale: number, marginTop?: number, arrow?: 'left' | 'right' }} props */
export default function ScreenButton({ label, displayLabel, accessibilityLabel, onPress, disabled = false, secondary = false, outlined = false, green = false, brand = false, scale, textScale, marginTop = 0, arrow }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
      style={[styles.startButton, {
        marginTop,
        minHeight: Math.max(50, 50 * scale),
        paddingHorizontal: Math.max(24, 28 * scale),
        ...(arrow && { flexDirection: 'row', gap: 10 * scale, paddingHorizontal: Math.max(16, 16 * scale), minWidth: 0 }),
      }, green && { backgroundColor: disabled ? '#CBD5E1' : '#1D5D4F', boxShadow: 'none' }, outlined && { backgroundColor: secondary ? '#EAF3F8' : '#C9DFEF', borderWidth: 1, borderColor: '#20465A' }, disabled && !green && !brand && { opacity: 0.5 },
      // Paleta oficial do Protótipo 2 (Revisão/Confirmação): verde #2E533A.
      brand && (outlined
        ? { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2E533A', borderRadius: 999, boxShadow: 'none' }
        : { backgroundColor: disabled ? '#D1D5DB' : '#2E533A', borderRadius: 999, boxShadow: 'none' })]}
    >
      {arrow === 'left' && <Text accessible={false} aria-hidden style={{ color: outlined ? '#20465A' : '#FFFFFF', fontSize: 24 * textScale }}>←</Text>}
      <Text style={[styles.startButtonText, {
        fontSize: 16 * textScale,
        lineHeight: 22 * textScale,
        fontWeight: 'bold',
        ...(arrow && { flexShrink: 1 }),
      }, green && { color: disabled ? '#8C95A0' : '#FFFFFF' }, outlined && { color: '#20465A' },
      brand && { color: outlined ? '#2E533A' : disabled ? '#8C95A0' : '#FFFFFF' }]}>{displayLabel || label}</Text>
      {arrow === 'right' && <Text accessible={false} aria-hidden style={{ color: outlined ? '#20465A' : '#FFFFFF', fontSize: 24 * textScale }}>→</Text>}
    </Pressable>
  );
}
