import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import RequirementIcon from '../components/RequirementIcon';
import { styles } from '../components/screenStyles';

const requirements = [
  { icon: 'person', text: 'Tenho 18 anos ou mais.' },
  { icon: 'work', text: 'Tenho vínculo ativo na instituição.' },
  { icon: 'calendar', text: 'Estou em atividade no período da pesquisa.' },
];

export default function BeforeStartScreen() {
  const { scale, textScale } = useScreenMetrics();
  const [confirmations, setConfirmations] = useState(() => requirements.map(() => false));
  const allConfirmed = confirmations.every(Boolean);
  /** @param {number} index */
  const toggleRequirement = (index) => {
    setConfirmations(previous => previous.map((checked, itemIndex) => itemIndex === index ? !checked : checked));
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <ScreenLayout beforeStart>
      <Text accessibilityRole="header" style={[styles.title, {
        alignSelf: 'stretch', textAlign: 'left', marginTop: 45 * scale, fontSize: 23 * textScale, lineHeight: 28 * textScale,
      }]}>Antes de começar</Text>
      <Text style={[styles.subtitle, {
        alignSelf: 'stretch', textAlign: 'left', marginTop: 14 * scale, fontSize: 16 * textScale, lineHeight: 19 * textScale,
      }]}>Confirme que você atende aos seguintes requisitos para participar da pesquisa:</Text>

      <View style={[local.requirements, { marginTop: 76 * scale, gap: 20 * scale }]}>
        {requirements.map((requirement, index) => (
          <Pressable
            key={requirement.icon}
            onPress={() => toggleRequirement(index)}
            accessible
            accessibilityRole="checkbox"
            accessibilityLabel={requirement.text}
            accessibilityState={{ checked: confirmations[index] }}
            style={[local.card, { minHeight: Math.max(44, 58 * scale) }]}
          >
            <RequirementIcon kind={requirement.icon} />
            <Text style={[local.requirementText, {
              fontSize: 16 * textScale, lineHeight: 19 * textScale,
            }]}>{requirement.text}</Text>
            {/* O estado é anunciado pelo cartão; o desenho não recebe foco separado. */}
            <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={local.confirmation}>
              {confirmations[index] && <View style={local.check} />}
            </View>
          </Pressable>
        ))}
      </View>

      <ScreenButton label="Continuar" onPress={() => { if (allConfirmed) router.push('/tcle'); }} disabled={!allConfirmed} outlined scale={scale} textScale={textScale} marginTop={83 * scale} />
      <ScreenButton label="Voltar" onPress={goBack} outlined secondary scale={scale} textScale={textScale} marginTop={18 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  requirements: { width: '100%' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 32, backgroundColor: '#B1C8D8' },
  requirementText: { flex: 1, flexShrink: 1, color: '#15242B' },
  confirmation: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#20465A', alignItems: 'center', justifyContent: 'center' },
  check: { width: 10, height: 6, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#20465A', transform: [{ rotate: '-45deg' }], marginTop: -2 },
});
