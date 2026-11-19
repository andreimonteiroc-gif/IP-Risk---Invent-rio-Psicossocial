import { useCallback, useState } from 'react';
import * as RN from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';
import ScreenButton from '../components/ScreenButton';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import { api } from '../services/api';
import { getCompletedPeriod } from '../services/participationStorage';

const { Image, Pressable, StyleSheet, Text, View } = RN;
const ScrollView = RN.ScrollView || View;
const StatusBar = RN.StatusBar || View;

export default function WelcomeScreen() {
  const { scale = 1, textScale = 1, insets } = useScreenMetrics();
  const { period, resetParticipation } = useQuestionnaire();
  const [step, setStep] = useState(1);
  const [alreadyParticipated, setAlreadyParticipated] = useState(false);
  const [sharedDeviceOverride, setSharedDeviceOverride] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setSharedDeviceOverride(false);
    const completed = getCompletedPeriod();
    if (!completed) {
      setAlreadyParticipated(false);
      return () => { active = false; };
    }
    if (period?.id) {
      setAlreadyParticipated(completed.periodo_id === period.id);
      return () => { active = false; };
    }
    api.loadCatalog().then(catalog => {
      if (active) setAlreadyParticipated(completed.periodo_id === catalog.period.id);
    }).catch(() => {
      if (active) setAlreadyParticipated(false);
    });
    return () => { active = false; };
  }, [period?.id]));

  const isLockedForCycle = alreadyParticipated && !sharedDeviceOverride;

  let image1 = null;
  let image2 = null;
  let logoSource = null;
  try {
    image1 = require('../../assets/onboarding-1.png');
    image2 = require('../../assets/onboarding-2.png');
  } catch {
    image1 = null;
    image2 = null;
  }
  try {
    logoSource = require('../../assets/ip-risk-logo.png');
  } catch {
    logoSource = null;
  }

  const isStep1 = step === 1;

  const handleNext = () => {
    if (isLockedForCycle) return;
    if (isStep1) {
      setStep(2);
    } else {
      router.push('/tcle');
    }
  };

  const handleSharedDeviceRetry = () => {
    resetParticipation();
    setSharedDeviceOverride(true);
    setStep(1);
  };

  const handleBack = () => {
    if (!isStep1) {
      setStep(1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(16, insets?.top || 0),
            paddingBottom: Math.max(24, (insets?.bottom || 0) + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.canvas, { maxWidth: 430 }]}>
          {logoSource && (
            <Image
              source={logoSource}
              style={{
                width: 180 * scale,
                height: 95 * scale,
                marginBottom: 10 * scale,
              }}
              resizeMode="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel="Logo IP RISK Inventário Psicossocial"
            />
          )}

          {/* Cabeçalho superior padronizado */}
          <Text
            accessibilityRole="header"
            style={[
              styles.mainTitle,
              {
                fontSize: 22 * textScale,
                lineHeight: 28 * textScale,
              },
            ]}
          >
            Sobre a avaliação
          </Text>

          <Text
            style={[
              styles.introText,
              {
                marginTop: 8 * scale,
                fontSize: 13 * textScale,
                lineHeight: 18 * textScale,
              },
            ]}
          >
            Uma ferramenta segura para mapear o ambiente de trabalho e o bem-estar.
          </Text>

          {/* Área da Ilustração */}
          <View
            style={[
              styles.illustrationContainer,
              {
                marginTop: 24 * scale,
                height: 160 * scale,
              },
            ]}
          >
            {isStep1 && image1 && (
              <Image
                source={image1}
                style={[styles.illustration, { width: 220 * scale, height: 150 * scale }]}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel="Pessoa organizando as áreas da avaliação"
              />
            )}
            {!isStep1 && image2 && (
              <Image
                source={image2}
                style={[styles.illustration, { width: 220 * scale, height: 150 * scale }]}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel="Pasta de documentos com cadeado protegendo dados"
              />
            )}
          </View>

          {/* Título secundário e descrição de cada etapa */}
          <View style={[styles.bodyBlock, { marginTop: 24 * scale }]}>
            <Text
              accessibilityRole="header"
              style={[
                styles.sectionTitle,
                {
                  fontSize: 18 * textScale,
                  lineHeight: 24 * textScale,
                },
              ]}
            >
              {isStep1 ? 'Base científica sólida' : 'Anonimato absoluto'}
            </Text>

            <Text
              style={[
                styles.description,
                {
                  marginTop: 10 * scale,
                  fontSize: 13 * textScale,
                  lineHeight: 19 * textScale,
                },
              ]}
            >
              {isStep1
                ? 'Questionário baseado no padrão global COPSOQ III, composto por 31 perguntas organizadas em áreas-chave: carga de trabalho, relações e liderança, valores, estabilidade, equilíbrio pessoal e saúde.'
                : 'A instituição recebe apenas dados consolidados. Sua identidade jamais aparecerá em respostas, gráficos ou relatórios gerados.'}
            </Text>

            {!isStep1 && (
              <Text
                style={[
                  styles.badgeInfo,
                  {
                    marginTop: 16 * scale,
                    fontSize: 12 * textScale,
                    lineHeight: 16 * textScale,
                  },
                ]}
              >
                31 perguntas • Respostas anônimas
              </Text>
            )}
          </View>

          {/* Espaçador flexível */}
          <View style={styles.spacer} />

          {/* Indicadores de progresso / paginação */}
          <View
            style={[styles.pagination, { marginVertical: 20 * scale }]}
            accessible
            accessibilityRole="none"
            accessibilityLabel={`Etapa ${step} de 2`}
          >
            <Pressable
              onPress={() => setStep(1)}
              style={[
                styles.pill,
                isStep1 ? styles.pillActive : styles.dotInactive,
                { width: isStep1 ? 24 * scale : 8 * scale, height: 8 * scale },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ir para primeira etapa do onboarding"
            />
            <Pressable
              onPress={() => setStep(2)}
              style={[
                styles.pill,
                !isStep1 ? styles.pillActive : styles.dotInactive,
                { width: !isStep1 ? 24 * scale : 8 * scale, height: 8 * scale },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ir para segunda etapa do onboarding"
            />
          </View>

          {/* Aviso de participação já registrada no ciclo atual */}
          {isLockedForCycle && (
            <View
              accessibilityRole="alert"
              style={[styles.completedCard, { marginBottom: 14 * scale, padding: 14 * scale }]}
            >
              <Text style={[styles.completedText, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                Você já registrou sua participação neste ciclo de avaliação.
              </Text>
            </View>
          )}

          {/* Botão de Ação Avançar */}
          <View style={styles.actionsFooter}>
            <ScreenButton
              label="Avançar"
              onPress={handleNext}
              disabled={isLockedForCycle}
              green
              scale={scale}
              textScale={textScale}
            />

            {isLockedForCycle && (
              <Pressable
                onPress={handleSharedDeviceRetry}
                style={[styles.sharedDeviceLink, { marginTop: 12 * scale }]}
                accessibilityRole="button"
                accessibilityLabel="Responder novamente (dispositivo compartilhado)"
              >
                <Text style={[styles.sharedDeviceText, { fontSize: 12 * textScale, lineHeight: 17 * textScale }]}>
                  Responder novamente (dispositivo compartilhado)
                </Text>
              </Pressable>
            )}

            {!isStep1 && (
              <Pressable
                onPress={handleBack}
                style={[styles.backLink, { marginTop: 12 * scale }]}
                accessibilityRole="button"
                accessibilityLabel="Voltar para a etapa anterior"
              >
                <Text style={[styles.backText, { fontSize: 13 * textScale }]}>
                  Voltar
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  mainTitle: {
    fontWeight: 'bold',
    color: '#1D5D4F',
    textAlign: 'center',
  },
  introText: {
    color: '#4A5665',
    textAlign: 'center',
    maxWidth: 320,
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    maxWidth: '100%',
  },
  bodyBlock: {
    width: '100%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#15242B',
    textAlign: 'center',
  },
  description: {
    color: '#4A5665',
    textAlign: 'center',
    maxWidth: 310,
  },
  badgeInfo: {
    color: '#1D5D4F',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    borderRadius: 4,
  },
  pillActive: {
    backgroundColor: '#DE5C2B',
  },
  dotInactive: {
    backgroundColor: '#1D5D4F',
    borderRadius: 4,
  },
  backLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  actionsFooter: {
    width: '100%',
    alignItems: 'center',
  },
  backText: {
    color: '#4A5665',
    textAlign: 'center',
  },
  completedCard: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#EAF4F0',
    borderWidth: 1,
    borderColor: '#1D5D4F',
  },
  completedText: {
    color: '#1D5D4F',
    fontWeight: '600',
    textAlign: 'center',
  },
  sharedDeviceLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sharedDeviceText: {
    color: '#4A5665',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
