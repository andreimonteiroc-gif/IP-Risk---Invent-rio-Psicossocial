import { Pressable, Text } from 'react-native';
import { styles } from './screenStyles';

/** @param {{ label: string, onPress?: import('react-native').PressableProps['onPress'], disabled?: boolean, secondary?: boolean, outlined?: boolean, scale: number, textScale: number, marginTop?: number, arrow?: 'left' | 'right' }} props */
export default function ScreenButton({ label, onPress, disabled = false, secondary = false, outlined = false, scale, textScale, marginTop = 0, arrow }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.startButton, {
        marginTop,
        minHeight: Math.max(44, 44 * scale),
        ...(arrow && { flexDirection: 'row', gap: 12 * scale, paddingHorizontal: 12 * scale }),
      }, outlined && { backgroundColor: secondary ? '#EAF3F8' : '#C9DFEF', borderWidth: 1, borderColor: '#20465A' }, disabled && { opacity: 0.5 }]}
    >
      {arrow === 'left' && <Text accessible={false} aria-hidden style={{ color: outlined ? '#20465A' : '#FFFFFF', fontSize: 24 * textScale }}>←</Text>}
      <Text style={[styles.startButtonText, {
        fontSize: 20 * textScale,
        lineHeight: 24 * textScale,
        ...(arrow && { flexShrink: 1 }),
      }, outlined && { color: '#20465A' }]}>{label}</Text>
      {arrow === 'right' && <Text accessible={false} aria-hidden style={{ color: outlined ? '#20465A' : '#FFFFFF', fontSize: 24 * textScale }}>→</Text>}
    </Pressable>
  );
}
