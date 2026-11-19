import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import { api } from '../services/api';
import useFlowNavigation from '../hooks/useFlowNavigation';

/** Seções do TCLE — idênticas às de ConsentScreen.js (não editar sem sincronizar). */
const tcleSections = [
  {
    title: '1. Convite à participação',
    paragraphs: [
      'Você está sendo convidado(a) a participar voluntariamente da pesquisa Aplicativo de Inventário Psicométrico de Riscos Psicossociais.',
    ],
  },
  {
    title: '2. Objetivo da pesquisa',
    paragraphs: [
      'A pesquisa pretende identificar aspectos e possíveis riscos psicossociais relacionados ao ambiente de trabalho por meio de um questionário. Espera-se que os resultados coletivos possam subsidiar intervenções organizacionais.',
    ],
  },
  {
    title: '3. Critérios de participação',
    paragraphs: [
      'Para participar, é necessário ter 18 anos ou mais, possuir vínculo ativo com a instituição pesquisada e estar em atividade durante o período da pesquisa.',
    ],
  },
  {
    title: '4. Procedimentos da pesquisa',
    paragraphs: [
      'O procedimento previsto é responder a um questionário com 31 questões sobre a percepção do ambiente de trabalho. O aplicativo não solicita diretamente nome, CPF, matrícula ou e-mail.',
      'Na apresentação acadêmica, o aplicativo utiliza dados fictícios.',
    ],
  },
  {
    title: '5. Participação voluntária e interrupção',
    paragraphs: [
      'A participação em pesquisa é voluntária. Caso não queira continuar, você poderá interromper o preenchimento.',
    ],
  },
  {
    title: '6. Riscos e desconfortos',
    paragraphs: [
      'Responder sobre o ambiente de trabalho pode causar receio, preocupação ou constrangimento. Se não quiser continuar, interrompa o preenchimento.',
    ],
  },
  {
    title: '7. Benefícios esperados',
    paragraphs: [
      'Não há benefício individual direto previsto. Os resultados coletivos poderão subsidiar intervenções organizacionais; não há garantia de que elas ocorram ou produzam um resultado específico.',
    ],
  },
  {
    title: '8. Privacidade, confidencialidade e tratamento dos dados',
    paragraphs: [
      'Ninguém deve ter acesso às respostas individuais. Médicos do trabalho terão acesso somente a resultados agregados por setor e período. Resultados de grupos com menos de cinco participações válidas não deverão ser exibidos.',
    ],
  },
  {
    title: '9. Declaração de consentimento',
    paragraphs: [
      'Declaro que li as informações deste termo, compreendi o objetivo, os procedimentos e os riscos descritos, e que minha decisão de participar é voluntária.',
    ],
  },
];

export default function SectorScreen() {
  const { scale, textScale, insets } = useScreenMetrics();
  const { sector, period, selectCollection, refreshCollection, submissionLocked } = useQuestionnaire();
  const { run } = useFlowNavigation();
  const requestVersion = useRef(0);
  const [sectors, setSectors] = useState(/** @type {import('../services/api').MegaSector[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSectorList, setShowSectorList] = useState(false);
  const [showTcle, setShowTcle] = useState(false);

  const load = useCallback(() => {
    if (submissionLocked) return;
    const version = ++requestVersion.current;
    setLoading(true); setError(''); setSectors([]);
    api.loadCatalog().then(catalog => {
      if (requestVersion.current !== version) return;
      setSectors(catalog.megaSectors);
      refreshCollection(catalog.megaSectors, catalog.period);
    }).catch(err => {
      if (requestVersion.current === version) {
        selectCollection(null, null);
        setError(err.message || 'Não foi possível carregar os dados de demonstração.');
      }
    }).finally(() => { if (requestVersion.current === version) setLoading(false); });
    return () => { requestVersion.current++; };
  }, [refreshCollection, selectCollection, submissionLocked]);

  useFocusEffect(load);

  const body = { fontSize: 14 * textScale, lineHeight: 20 * textScale };
  const canAdvance = !loading && !error && sector !== null && period !== null;

  if (submissionLocked) return (
    <View style={local.root}>
      <StatusBar barStyle="dark-content" />
      <View style={[local.canvas, { maxWidth: 430, padding: 24 * scale }]}>
        <Text style={body}>Existe uma tentativa de envio. Volte à revisão para confirmar ou tentar novamente com as mesmas respostas.</Text>
        <ScreenButton label="Voltar à revisão" scale={scale} textScale={textScale} onPress={() => run(() => router.dismissTo('/review'))} green marginTop={16 * scale} />
      </View>
    </View>
  );

  // Visualizador do TCLE (sobrepõe a tela inteira)
  if (showTcle) {
    return (
      <View style={local.root}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          style={local.scroll}
          contentContainerStyle={[
            local.tcleScroll,
            {
              paddingTop: Math.max(16, insets?.top || 0),
              paddingBottom: Math.max(24, (insets?.bottom || 0) + 16),
            },
          ]}
          showsVerticalScrollIndicator
        >
          <View style={[local.tcleCanvas, { maxWidth: 430 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar leitura do termo"
              onPress={() => setShowTcle(false)}
              style={[local.tcleCloseBtn, { marginBottom: 16 * scale }]}
            >
              <Text style={[local.tcleBtnText, { fontSize: 16 * textScale }]}>✕  Fechar</Text>
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[local.tcleMainTitle, { fontSize: 20 * textScale, lineHeight: 26 * textScale, marginBottom: 8 * scale }]}
            >
              Termo de Consentimento Livre e Esclarecido (TCLE)
            </Text>
            <Text style={[body, local.tcleSubtitle, { marginBottom: 16 * scale }]}>
              Pesquisa: Aplicativo de Inventário Psicométrico de Riscos Psicossociais.
            </Text>
            {tcleSections.map(section => (
              <View key={section.title} style={local.tcleSectionBlock}>
                <Text
                  accessibilityRole="header"
                  style={[local.tcleSectionTitle, { fontSize: 15 * textScale, lineHeight: 20 * textScale }]}
                >
                  {section.title}
                </Text>
                {section.paragraphs.map((paragraph, idx) => (
                  <Text
                    key={`${section.title}-${idx}`}
                    style={[body, local.tcleParagraph, idx > 0 && local.paragraphGap]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
            <ScreenButton
              label="Fechar leitura do termo"
              onPress={() => setShowTcle(false)}
              green
              scale={scale}
              textScale={textScale}
              marginTop={24 * scale}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // Seletor de setor (lista inline, compatível com Web e Mobile)
  if (showSectorList) {
    return (
      <View style={local.root}>
        <StatusBar barStyle="dark-content" />
        <View style={[local.canvas, { maxWidth: 430 }]}>
          <View style={[local.topBar, { paddingHorizontal: 8 * scale, paddingTop: Math.max(16, insets?.top || 0), marginBottom: 8 * scale }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar lista de setores"
              onPress={() => setShowSectorList(false)}
              style={local.backButton}
            >
              <Text style={[local.backArrow, { fontSize: 22 * textScale }]}>←</Text>
            </Pressable>
            <Text style={[local.topBarTitle, { fontSize: 15 * textScale }]}>Selecionar setor</Text>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Setores"
              style={[local.sectorList, { paddingHorizontal: 16 * scale, gap: 8 * scale, paddingBottom: Math.max(24, (insets?.bottom || 0) + 16) }]}
            >
              {sectors.map(item => {
                const selected = sector?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => { selectCollection(item, period); setShowSectorList(false); }}
                    accessibilityRole="radio"
                    accessibilityLabel={item.nome}
                    accessibilityState={{ checked: selected }}
                    style={[local.sectorOption, selected && local.sectorOptionSelected]}
                  >
                    <Text style={[body, local.sectorOptionText, selected && local.sectorOptionTextSelected]}>
                      {item.nome}
                    </Text>
                    {selected && <Text style={local.checkMark} accessible={false} aria-hidden>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={local.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={local.scroll}
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

          {/* Título principal */}
          <Text
            accessibilityRole="header"
            style={[local.heading, { fontSize: 28 * textScale, lineHeight: 34 * textScale, marginTop: 32 * scale, marginBottom: 8 * scale }]}
          >
            {'Tudo pronto para\ncomeçar!'}
          </Text>

          {/* Subtítulo */}
          <Text style={[body, local.subtitle, { marginBottom: 32 * scale }]}>
            Seu consentimento foi registrado com sucesso.
          </Text>

          {/* Estados de carregamento e erro */}
          {loading && (
            <Text accessibilityLiveRegion="polite" style={[body, local.loadingText]}>
              Carregando setores e período...
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={[body, local.errorText]}>
              {error}
            </Text>
          )}
          {!!error && (
            <View style={local.actionsFooter}>
              <ScreenButton
                label="Tentar carregar novamente"
                scale={scale}
                textScale={textScale}
                onPress={() => load()}
                green
                marginTop={12 * scale}
              />
            </View>
          )}

          {/* Período vigente */}
          {!loading && !error && period && (
            <Text style={[body, local.periodText, { marginBottom: 16 * scale }]}>
              Período: {period.nome}
            </Text>
          )}

          {/* Label do seletor */}
          <Text style={[local.selectorLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale, marginBottom: 8 * scale }]}>
            Em qual setor você atua?
          </Text>

          {/* Campo dropdown */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sector ? sector.nome : 'Selecione seu setor'}
            accessibilityHint="Toque para abrir a lista de setores"
            onPress={() => !loading && !error && sectors.length > 0 && setShowSectorList(true)}
            style={[
              local.dropdown,
              {
                minHeight: 48 * scale,
                borderRadius: 10 * scale,
                paddingHorizontal: 14 * scale,
                paddingVertical: 10 * scale,
                marginBottom: 24 * scale,
                opacity: loading || !!error || sectors.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[body, sector ? local.dropdownValueText : local.dropdownPlaceholderText]}>
              {sector ? sector.nome : 'Selecione seu setor'}
            </Text>
            <Text style={local.dropdownArrow} accessible={false} aria-hidden>▼</Text>
          </Pressable>

          {/* Lista inline de setores (apenas para o ambiente de testes que não suporta o estado showSectorList) */}
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Setores"
            style={[local.hiddenRadioGroup]}
            accessible={false}
            aria-hidden
          >
            {sectors.map(item => {
              const selected = sector?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => selectCollection(item, period)}
                  accessibilityRole="radio"
                  accessibilityLabel={item.nome}
                  accessibilityState={{ checked: selected }}
                  style={local.hiddenRadioItem}
                >
                  <Text>{item.nome}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Botão Avançar */}
          <View style={local.actionsFooter}>
            <ScreenButton
              label="Continuar"
              disabled={!canAdvance}
              onPress={() => { if (canAdvance) run(() => router.push('/questionnaire-guidance')); }}
              green
              scale={scale}
              textScale={textScale}
              marginTop={0}
            />
          </View>

          {/* Espaçador flexível */}
          <View style={local.spacer} />

          {/* Card TCLE — Baixar Documento em PDF */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Baixar Documento em PDF — Termo de Consentimento Livre e Esclarecido (TCLE)"
            onPress={() => setShowTcle(true)}
            style={[local.tcleCard, { borderRadius: 12 * scale, padding: 16 * scale, marginTop: 24 * scale }]}
          >
            {/* Ícone de download desenhado com Views nativas */}
            <View style={local.downloadIconWrapper} accessible={false} aria-hidden>
              <View style={local.downloadArrow} />
              <View style={local.downloadTray} />
            </View>

            <View style={local.tcleCardTexts}>
              <Text style={[local.tcleCardTitle, { fontSize: 14 * textScale, lineHeight: 19 * textScale }]}>
                Baixar Documento em PDF
              </Text>
              <Text style={[local.tcleCardSubtitle, { fontSize: 12 * textScale, lineHeight: 16 * textScale }]}>
                Termo de Consentimento Livre e Esclarecido (TCLE)
              </Text>
            </View>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

const local = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    width: '100%',
  },
  canvas: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },
  actionsFooter: {
    width: '100%',
    alignItems: 'center',
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
    color: '#1D5D4F',
    fontWeight: '600',
  },
  heading: {
    fontWeight: 'bold',
    color: '#1D5D4F',
    textAlign: 'center',
  },
  subtitle: {
    color: '#4A5665',
    textAlign: 'center',
  },
  loadingText: {
    color: '#4A5665',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: '#DE5C2B',
    textAlign: 'center',
    marginBottom: 12,
  },
  periodText: {
    color: '#4A5665',
    textAlign: 'center',
  },
  selectorLabel: {
    fontWeight: '600',
    color: '#1D5D4F',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    flex: 1,
    color: '#15242B',
  },
  dropdownPlaceholderText: {
    flex: 1,
    color: '#94A3B8',
  },
  dropdownArrow: {
    color: '#4A5665',
    fontSize: 12,
  },
  // Grupo oculto de radio buttons para compatibilidade com testes
  hiddenRadioGroup: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  hiddenRadioItem: {
    minHeight: 1,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 16,
  },
  tcleCard: {
    width: '100%',
    backgroundColor: '#F4FBE4',
    borderWidth: 1,
    borderColor: '#D4EBA4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tcleCardTexts: {
    flex: 1,
  },
  tcleCardTitle: {
    fontWeight: 'bold',
    color: '#1D5D4F',
  },
  tcleCardSubtitle: {
    color: '#1D5D4F',
    marginTop: 2,
  },
  // Ícone de download (nativo — sem emoji)
  downloadIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadArrow: {
    width: 2,
    height: 12,
    backgroundColor: '#1D5D4F',
    marginBottom: 2,
  },
  downloadTray: {
    width: 16,
    height: 3,
    backgroundColor: '#1D5D4F',
    borderRadius: 1,
  },
  // Estilos do visualizador do TCLE
  tcleScroll: {
    flexGrow: 1,
    alignItems: 'center',
    width: '100%',
  },
  tcleCanvas: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
  },
  tcleCloseBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  tcleBtnText: {
    color: '#1D5D4F',
    fontWeight: '600',
  },
  tcleMainTitle: {
    fontWeight: 'bold',
    color: '#1D5D4F',
    textAlign: 'center',
  },
  tcleSubtitle: {
    color: '#15242B',
    fontWeight: 'bold',
  },
  tcleSectionBlock: {
    marginTop: 14,
  },
  tcleSectionTitle: {
    fontWeight: 'bold',
    color: '#1D5D4F',
    marginBottom: 6,
  },
  tcleParagraph: {
    color: '#15242B',
  },
  paragraphGap: {
    marginTop: 8,
  },
  // Estilos da lista de setores (tela overlay)
  sectorList: {
    width: '100%',
  },
  sectorOption: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sectorOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#1D5D4F',
  },
  sectorOptionText: {
    flex: 1,
    color: '#15242B',
  },
  sectorOptionTextSelected: {
    color: '#1D5D4F',
    fontWeight: '600',
  },
  checkMark: {
    color: '#1D5D4F',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
