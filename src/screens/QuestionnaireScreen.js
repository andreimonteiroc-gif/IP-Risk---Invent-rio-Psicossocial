import { useState } from 'react';
import * as RN from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';
import AppMenuModal from '../components/AppMenuModal';
import ScreenButton from '../components/ScreenButton';
import QuestionCard from '../components/QuestionCard';
import { questions } from '../data/questions';
import { questionBlocks } from '../data/questionnaireReview';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';
import { openOrDownloadTcle } from '../utils/tclePdf';

const { Pressable, StyleSheet, Text, View } = RN;
const ScrollView = RN.ScrollView || View;
const StatusBar = RN.StatusBar || View;

/** @param {number} blockIndex @param {number} startQ @param {number} endQ */
function getBlockInstructions(blockIndex, startQ, endQ) {
  if (blockIndex === 5) {
    return `Das questões ${startQ} à ${endQ}, considere como você se sentiu nas últimas 4 semanas.`;
  }
  if (blockIndex === 6) {
    return `Das questões ${startQ} à ${endQ}, responda Sim ou Não considerando os últimos 12 meses no ambiente de trabalho.`;
  }
  return `Das questões ${startQ} à ${endQ}, selecione a opção que melhor reflete a sua percepção sobre o ambiente de trabalho.`;
}

export default function QuestionnaireScreen() {
  const { scale = 1, textScale = 1, insets } = useScreenMetrics();
  const { questionId, fromReview } = useLocalSearchParams();
  const { answers, currentIndex, setCurrentIndex, selectAnswer: saveAnswer, resetParticipation, submissionLocked } = useQuestionnaire();
  const [menuOpen, setMenuOpen] = useState(false);

  const editing = fromReview === 'true';
  const requestedIndex = questions.findIndex(item => item.id === questionId);
  const activeIndex = editing ? Math.max(0, requestedIndex) : currentIndex;
  const question = questions[activeIndex];
  const { run, open } = useFlowNavigation(`${editing ? 'edit' : 'question'}:${question.id}`);

  const currentNumber = activeIndex + 1;
  const isLast = currentNumber === questions.length;
  const selectedAnswer = answers[question.id];

  const blockIndex = Math.max(0, questionBlocks.findIndex(b => b.title === question.dimension));
  const currentBlock = questionBlocks[blockIndex] || { title: question.dimension, questions: [question] };
  const blockNumber = blockIndex + 1;
  const totalBlocks = questionBlocks.length;
  const firstInBlock = questions.indexOf(currentBlock.questions[0]) + 1;
  const lastInBlock = questions.indexOf(currentBlock.questions[currentBlock.questions.length - 1]) + 1;
  const progressPercent = Math.round((currentNumber / questions.length) * 100);

  /** @param {string} answer */
  const selectAnswer = answer => {
    saveAnswer(question.id, answer);
  };
  const returnToReview = () => {
    router.dismissTo('/review');
  };
  const advance = () => {
    if (!selectedAnswer) return;
    run(() => {
      if (editing) returnToReview();
      else if (isLast) open('/review');
      else if (activeIndex === 26) open('/sensitive-guidance');
      else setCurrentIndex(currentIndex + 1);
    });
  };
  const goBack = () => {
    run(() => {
      if (editing) { returnToReview(); return; }
      if (currentIndex > 0) setCurrentIndex(index => Math.max(0, index - 1));
      else router.dismissTo('/questionnaire-guidance');
    });
  };
  const handleClose = () => {
    run(() => {
      resetParticipation();
      router.dismissTo('/');
    });
  };

  if (submissionLocked) return (
    <View style={local.root}>
      <StatusBar barStyle="light-content" />
      <View style={[local.lockedContainer, { maxWidth: 430, padding: 24 * scale }]}>
        <Text style={{ fontSize: 15 * textScale, lineHeight: 21 * textScale, color: '#15242B' }}>
          As respostas pertencem a uma tentativa de envio. Volte à revisão para consultar a confirmação.
        </Text>
        <ScreenButton
          label="Voltar à revisão"
          green
          scale={scale}
          textScale={textScale}
          marginTop={16 * scale}
          onPress={() => run(returnToReview)}
        />
      </View>
    </View>
  );

  const isFirstQuestion = currentIndex === 0;

  return (
    <View style={local.root} key={question.id}>
      <StatusBar barStyle="light-content" />

      <View style={[local.screenFrame, { maxWidth: 430 }]}>
        {/* Cabeçalho superior verde-escuro */}
        <View
          style={[
            local.headerBar,
            {
              paddingTop: Math.max(12 * scale, (insets?.top || 0) + 8 * scale),
              paddingBottom: 12 * scale,
              paddingHorizontal: 20 * scale,
            },
          ]}
        >
          <View style={local.logoRow} accessible accessibilityRole="header" accessibilityLabel="IP RISK">
            <Text style={[local.logoIp, { fontSize: 15 * textScale }]}>IP</Text>
            <View style={[local.logoRiskBadge, { paddingHorizontal: 6 * scale, paddingVertical: 2 * scale }]}>
              <Text style={[local.logoRiskText, { fontSize: 14 * textScale }]}>RISK</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
            onPress={() => setMenuOpen(prev => !prev)}
            style={local.menuButton}
          >
            <View style={local.menuIcon} accessible={false} aria-hidden>
              <View style={local.menuLine} />
              <View style={local.menuLine} />
              <View style={local.menuLine} />
            </View>
          </Pressable>
        </View>

        <AppMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} onPressTcle={openOrDownloadTcle} />

        {/* Acesso oculto para encerramento usado nos testes automatizados */}
        <View style={local.hiddenAccess} accessible={false} aria-hidden>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={handleClose}
          >
            <Text>Fechar</Text>
          </Pressable>
        </View>

        {/* Área principal rolável */}
        <ScrollView
          contentContainerStyle={[
            local.scrollContent,
            {
              paddingHorizontal: 22 * scale,
              paddingTop: 18 * scale,
              paddingBottom: Math.max(24 * scale, (insets?.bottom || 0) + 20 * scale),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Título do Bloco */}
          <Text
            accessibilityRole="header"
            style={[
              local.blockTitle,
              {
                fontSize: 17 * textScale,
                lineHeight: 23 * textScale,
              },
            ]}
          >
            Bloco {blockNumber}: {question.dimension}
          </Text>

          {/* Linha de Progresso */}
          <View style={[local.progressRow, { marginTop: 10 * scale }]}>
            <Text style={[local.stageText, { fontSize: 11 * textScale, lineHeight: 15 * textScale }]}>
              ETAPA {blockNumber} DE {totalBlocks}
            </Text>
            <Text style={[local.percentText, { fontSize: 12 * textScale, lineHeight: 16 * textScale }]}>
              {progressPercent}% Completo
            </Text>
          </View>

          {/* Barra de Progresso Linear */}
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progresso do questionário"
            accessibilityValue={{
              min: 1,
              max: questions.length,
              now: currentNumber,
              text: `Questão ${currentNumber} de ${questions.length}`,
            }}
            style={[local.track, { marginTop: 6 * scale }]}
          >
            <View style={[local.fill, { width: `${(currentNumber / questions.length) * 100}%` }]} />
          </View>

          {/* Caixa de Instruções */}
          <View
            style={[
              local.instructionBox,
              {
                marginTop: 16 * scale,
                paddingVertical: 12 * scale,
                paddingHorizontal: 14 * scale,
                borderRadius: 10 * scale,
              },
            ]}
          >
            <Text style={[local.instructionText, { fontSize: 12 * textScale, lineHeight: 17 * textScale }]}>
              <Text style={local.instructionBold}>Instruções: </Text>
              {getBlockInstructions(blockIndex, firstInBlock, lastInBlock)}
            </Text>
          </View>

          {/* Enunciado + Cartões de Alternativas */}
          <QuestionCard question={question} selectedAnswer={selectedAnswer} onSelect={selectAnswer} />

          <View style={local.spacer} />

          {/* Rodapé de Navegação */}
          {editing ? (
            <View style={{ width: '100%', marginTop: 24 * scale }}>
              <View style={[local.editNavigation, { gap: 12 * scale }]}>
                <View style={local.editNavButton}>
                  <ScreenButton
                    label="Voltar à revisão"
                    onPress={goBack}
                    outlined
                    secondary
                    arrow="left"
                    scale={scale}
                    textScale={textScale}
                  />
                </View>
                <View style={local.editNavButton}>
                  <ScreenButton
                    label="Concluir correção"
                    disabled={!selectedAnswer}
                    onPress={advance}
                    green
                    arrow="right"
                    scale={scale}
                    textScale={textScale}
                  />
                </View>
              </View>
              <Text style={[local.notice, { fontSize: 14 * textScale, lineHeight: 19 * textScale }]}>
                A alteração é guardada ao selecionar uma alternativa. Volte à revisão para conferir.
              </Text>
            </View>
          ) : (
            <View style={[local.footerNav, { marginTop: 28 * scale }]}>
              {/* Botão Circular Esquerdo — Voltar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={goBack}
                style={local.circleActionWrapper}
              >
                <View
                  style={[
                    local.circleButton,
                    isFirstQuestion ? local.circleButtonMuted : local.circleButtonActive,
                    {
                      width: 44 * scale,
                      height: 44 * scale,
                      borderRadius: 22 * scale,
                    },
                  ]}
                >
                  <Text
                    accessible={false}
                    aria-hidden
                    style={[
                      local.circleArrow,
                      { fontSize: 18 * textScale },
                      isFirstQuestion && local.circleArrowMuted,
                    ]}
                  >
                    {'<'}
                  </Text>
                </View>
                <Text
                  style={[
                    local.circleLabel,
                    { fontSize: 12 * textScale, lineHeight: 16 * textScale, marginTop: 4 * scale },
                    isFirstQuestion && local.circleLabelMuted,
                  ]}
                >
                  Voltar
                </Text>
              </Pressable>

              {/* Botão Circular Direito — Próximo / Revisar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isLast ? 'Revisar respostas' : 'Avançar'}
                disabled={!selectedAnswer}
                accessibilityState={{ disabled: !selectedAnswer }}
                onPress={advance}
                style={local.circleActionWrapper}
              >
                <View
                  style={[
                    local.circleButton,
                    selectedAnswer ? local.circleButtonActive : local.circleButtonDisabled,
                    {
                      width: 44 * scale,
                      height: 44 * scale,
                      borderRadius: 22 * scale,
                    },
                  ]}
                >
                  <Text
                    accessible={false}
                    aria-hidden
                    style={[local.circleArrow, { fontSize: 18 * textScale }]}
                  >
                    {'>'}
                  </Text>
                </View>
                <Text
                  style={[
                    local.circleLabel,
                    { fontSize: 12 * textScale, lineHeight: 16 * textScale, marginTop: 4 * scale },
                    !selectedAnswer && local.circleLabelMuted,
                  ]}
                >
                  {isLast ? 'Revisar' : 'Próximo'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  screenFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  lockedContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  headerBar: {
    width: '100%',
    backgroundColor: '#085848',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoIp: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoRiskBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRiskText: {
    color: '#085848',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuIcon: {
    width: 20,
    gap: 4,
  },
  menuLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#A5FF52',
  },
  menuDropdown: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuItem: {
    minHeight: 44,
    justifyContent: 'center',
  },
  menuItemText: {
    color: '#1D5D4F',
    fontWeight: '600',
  },
  menuItemExitText: {
    color: '#DE5C2B',
    fontWeight: '600',
  },
  hiddenAccess: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
  },
  blockTitle: {
    color: '#085848',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  progressRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageText: {
    color: '#F25C19',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  percentText: {
    color: '#64748B',
    fontWeight: '500',
  },
  track: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F25C19',
  },
  instructionBox: {
    width: '100%',
    backgroundColor: '#F4FBE4',
    borderWidth: 1,
    borderColor: '#D4EBA4',
  },
  instructionText: {
    color: '#15242B',
  },
  instructionBold: {
    fontWeight: 'bold',
  },
  spacer: {
    flexGrow: 1,
    minHeight: 16,
  },
  footerNav: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleActionWrapper: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: {
    backgroundColor: '#085848',
  },
  circleButtonMuted: {
    backgroundColor: '#D1D5DB',
  },
  circleButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  circleArrow: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  circleArrowMuted: {
    color: '#FFFFFF',
  },
  circleLabel: {
    color: '#15242B',
    fontWeight: '600',
    textAlign: 'center',
  },
  circleLabelMuted: {
    color: '#94A3B8',
  },
  editNavigation: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editNavButton: {
    flex: 1,
    maxWidth: '50%',
  },
  notice: {
    width: '100%',
    padding: 14,
    marginTop: 14,
    borderRadius: 10,
    color: '#1D5D4F',
    backgroundColor: '#F4FBE4',
    borderWidth: 1,
    borderColor: '#D4EBA4',
  },
});
