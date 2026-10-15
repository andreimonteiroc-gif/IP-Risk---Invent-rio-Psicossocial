import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import ScreenLayout, { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { styles } from '../components/screenStyles';

// Lista provisória: depende de validação pelo responsável pela pesquisa.
const sectors = ['Docência', 'Administrativo', 'Técnico de Laboratório', 'Gestão', 'Apoio', 'Biblioteca', 'Outro'];

export default function SectorScreen() {
  const { scale, textScale } = useScreenMetrics();
  // Estado restrito a esta instância da rota. Voltar das orientações o preserva;
  // sair da rota ou iniciar um novo fluxo cria uma seleção vazia.
  const [sector, setSector] = useState(/** @type {string | null} */ (null));
  const body = { fontSize: 16 * textScale, lineHeight: 19 * textScale };

  return (
    <ScreenLayout plain>
      <Text accessibilityRole="header" style={[styles.title, local.heading, {
        marginTop: 40 * scale, fontSize: 24 * textScale, lineHeight: 29 * textScale,
      }]}>Qual seu setor?</Text>
      <Text style={[body, local.subtitle, { marginTop: 12 * scale }]}>Selecione o setor em que você atua atualmente.</Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Setor de atuação" style={[local.options, { marginTop: 40 * scale, gap: 8 * scale }]}>
        {sectors.map(item => {
          const selected = sector === item;
          return (
            <Pressable key={item} onPress={() => setSector(item)} accessibilityRole="radio"
              accessibilityLabel={item} accessibilityState={{ checked: selected }}
              style={[local.option, selected && local.selected]}>
              <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[local.box, selected && local.checked]}>
                {selected && <Text style={local.check}>✓</Text>}
              </View>
              <Text style={[body, local.optionText, selected && local.selectedText]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[local.infoCard, { marginTop: 26 * scale }]}>
        <Text accessible={false} aria-hidden style={local.infoIcon}>ⓘ</Text>
        <Text style={[body, local.infoText]}>Usamos o setor apenas para gerar resultados coletivos. Só são divulgados resultados de setores com pelo menos 5 respostas.</Text>
      </View>
      <ScreenButton label="Continuar" disabled={sector === null}
        onPress={() => { if (sector !== null) router.push('/questionnaire-guidance'); }}
        scale={scale} textScale={textScale} marginTop={32 * scale} />
      <ScreenButton label="Voltar ao TCLE" outlined secondary
        onPress={() => router.canGoBack() ? router.back() : router.replace('/tcle')}
        scale={scale} textScale={textScale} marginTop={12 * scale} />
      <ScreenButton label="Fechar" outlined secondary onPress={() => router.dismissTo('/')}
        scale={scale} textScale={textScale} marginTop={12 * scale} />
    </ScreenLayout>
  );
}

const local = StyleSheet.create({
  heading: { alignSelf: 'stretch', textAlign: 'left' },
  subtitle: { alignSelf: 'stretch', color: '#101010', maxWidth: 280 },
  options: { width: '100%' },
  option: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, backgroundColor: '#B1C8D8', borderWidth: 2, borderColor: 'transparent' },
  selected: { backgroundColor: '#20465A', borderColor: '#20465A' },
  box: { width: 20, height: 20, borderRadius: 3, borderWidth: 1.5, borderColor: '#20465A', backgroundColor: '#EAF3F8', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: '#20465A', borderColor: '#FFFFFF' },
  check: { fontSize: 14, lineHeight: 18, fontWeight: 'bold', color: '#FFFFFF' },
  optionText: { flex: 1, color: '#20465A', textAlign: 'center' },
  selectedText: { color: '#FFFFFF' },
  infoCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, backgroundColor: '#C9DFEF', padding: 16 },
  infoIcon: { fontSize: 24, color: '#20465A' },
  infoText: { flex: 1, color: '#101010' },
});
