import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { styles } from '../components/screenStyles';

const options = [
  { value: 'agree', label: 'Li e concordo com o termo TCLE' },
  { value: 'refuse', label: 'Não concordo' },
];

export default function ConsentScreen() {
  const { scale, textScale } = useScreenMetrics();
  const [choice, setChoice] = useState(/** @type {string | null} */ (null));
  // Limpa também ao voltar da recusa por gesto ou pelo botão de navegação.
  useFocusEffect(useCallback(() => {
    setChoice(null);
  }, []));
  const body = { fontSize: 16 * textScale, lineHeight: 19 * textScale };
  const continueFlow = () => {
    if (choice === 'refuse') {
      setChoice(null);
      router.push('/refusal');
    } else if (choice === 'agree') {
      router.push('/sector');
    }
  };

  return (
    <ScreenLayout>
      <Text accessibilityRole="header" style={[styles.title, local.title, {
        marginTop: 45 * scale, fontSize: 23 * textScale, lineHeight: 28 * textScale,
      }]}>Termo de Consentimento Livre e Esclarecido (TCLE)</Text>
      <View style={local.reading}>
        <Text style={[local.text, body, { marginTop: 20 * scale }]}>
          Para participar, leia o Termo de Consentimento Livre e Esclarecido (TCLE).
        </Text>
        <Text style={[local.notice, body]}>
          Conteúdo provisório de interface, pendente de validação pelo responsável pela pesquisa. Não constitui o TCLE definitivo.
        </Text>
        <Text accessibilityRole="header" style={[local.section, body]}>1. Informações gerais</Text>
        <Text style={[local.text, body]}>
          Esta pesquisa tem como objetivo identificar riscos psicossociais no ambiente de trabalho, por meio de um questionário. A participação é voluntária.
        </Text>
        <Text accessibilityRole="header" style={[local.section, body]}>2. Privacidade</Text>
        <Text style={[local.text, body]}>
          As condições de coleta, tratamento e apresentação dos dados deverão ser detalhadas no TCLE definitivo e validadas pelo responsável pela pesquisa. Nesta etapa do protótipo, não são registrados dados pessoais, consentimento ou respostas de pesquisa.
        </Text>
      </View>

      <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }}
        accessibilityLabel="Baixar cópia do termo TCLE. Indisponível: documento oficial pendente."
        style={local.download}>
        <Text style={[body, local.downloadText]}>↓ Baixar cópia do termo TCLE</Text>
        <Text style={[local.text, { fontSize: 14 * textScale, lineHeight: 18 * textScale }]}>Indisponível — documento oficial pendente.</Text>
      </Pressable>

      <View accessibilityRole="radiogroup" accessibilityLabel="Escolha sobre o termo TCLE" style={local.options}>
        {options.map(option => (
          <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
            accessibilityState={{ checked: choice === option.value }}
            onPress={() => setChoice(option.value)}
            style={[local.option, choice === option.value && local.selected]}>
            <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[local.box, choice === option.value && local.checkedBox]}>
              {choice === option.value && <Text style={local.check}>✓</Text>}
            </View>
            <Text style={[body, local.optionText]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScreenButton label="Continuar" disabled={choice === null} onPress={continueFlow} outlined secondary
        scale={scale} textScale={textScale} marginTop={46 * scale} />
      <ScreenButton label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/before-start')}
        outlined secondary scale={scale} textScale={textScale} marginTop={18 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  title: { alignSelf: 'stretch', textAlign: 'left' },
  reading: { width: '100%' },
  text: { color: '#101010' },
  section: { marginTop: 22, marginBottom: 12, fontWeight: 'bold', color: '#101010' },
  notice: { alignSelf: 'stretch', marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#C9DFEF', color: '#20465A' },
  download: { width: '100%', minHeight: 44, justifyContent: 'center', marginTop: 24, gap: 4 },
  downloadText: { color: '#20465A', textDecorationLine: 'underline' },
  options: { width: '100%', marginTop: 16, gap: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 24, minHeight: 44, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#B1C8D8' },
  selected: { borderColor: '#20465A' },
  optionText: { flex: 1, color: '#20465A' },
  box: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 3, borderColor: '#20465A', alignItems: 'center', justifyContent: 'center' },
  checkedBox: { backgroundColor: '#20465A', borderColor: '#FFFFFF' },
  check: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, lineHeight: 18 },
});
