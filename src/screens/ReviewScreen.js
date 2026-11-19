import { useCallback, useState } from 'react';
import * as RN from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useScreenMetrics } from '../components/ScreenLayout';
import AppHeader from '../components/AppHeader';
import AppMenuModal from '../components/AppMenuModal';
import ScreenButton from '../components/ScreenButton';
import ReviewBlock from '../components/ReviewBlock';
import { colors } from '../theme/colors';
import { questions } from '../data/questions';
import { countAnswers, isQuestionnaireComplete, questionBlocks } from '../data/questionnaireReview';
import { useQuestionnaire } from '../state/QuestionnaireContext';
import useFlowNavigation from '../hooks/useFlowNavigation';
import { openOrDownloadTcle } from '../utils/tclePdf';

const { StyleSheet, Text, View } = RN;
// O runner de testes só fornece Text/View/Pressable; ScrollView/StatusBar/ActivityIndicator são opcionais.
const ScrollView = RN.ScrollView || View;
const StatusBar = RN.StatusBar || View;
const ActivityIndicator = RN.ActivityIndicator || null;

/** Abertura inicial do acordeão: sem respostas, tudo fechado; com respostas, blocos pendentes
 * ficam visíveis, ou o primeiro bloco quando tudo está respondido.
 * @param {import('../data/questionnaireReview').Answers} answers */
function initialExpanded(answers) {
  /** @type {Record<string, boolean>} */
  const open = {};
  if (countAnswers(questions, answers) === 0) return open;
  const pending = questionBlocks.filter(block => countAnswers(block.questions, answers) < block.questions.length);
  for (const block of pending.length ? pending : questionBlocks.slice(0, 1)) open[block.title] = true;
  return open;
}

export default function ReviewScreen() {
  const { scale = 1, textScale = 1, insets } = useScreenMetrics();
  const { answers, resetParticipation, sector, period, submissionStatus, submissionError, submissionLocked } = useQuestionnaire();
  const { run, open } = useFlowNavigation();
  const [expanded, setExpanded] = useState(() => initialExpanded(answers));
  const [discarding, setDiscarding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  useFocusEffect(useCallback(() => {
    setLocalSubmitting(false);
  }, []));
  const answered = countAnswers(questions, answers);
  const complete = isQuestionnaireComplete(answers);
  const sending = submissionStatus === 'sending';
  const isSubmitting = sending || localSubmitting;
  const success = submissionStatus === 'success';
  const body = { fontSize: 14 * textScale, lineHeight: 20 * textScale };
  const percent = Math.round(answered / questions.length * 100);
  const canContinue = complete && !!sector && !!period && !isSubmitting;

  return (
    <View style={local.root}>
      <StatusBar barStyle="light-content" />
      <View style={local.frame}>
        <AppHeader onMenuPress={() => setMenuOpen(true)} />
        <AppMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} onPressTcle={openOrDownloadTcle} />
        <ScrollView contentContainerStyle={[local.scroll, {
          paddingHorizontal: 22 * scale, paddingTop: 20 * scale,
          paddingBottom: Math.max(24 * scale, (insets?.bottom || 0) + 20 * scale),
        }]}>
          <Text accessibilityRole="header" style={[local.title, { fontSize: 20 * textScale, lineHeight: 26 * textScale }]}>Revise suas respostas antes do envio definitivo</Text>
          <Text style={[body, local.description]}>Você pode clicar em qualquer questão para conferir ou alterar sua opção. Uma vez enviado, o formulário não poderá ser editado.</Text>

          <View style={[local.progressRow, { marginTop: 18 * scale }]}>
            <Text accessibilityLiveRegion="polite" style={[local.progressCount, { fontSize: 11 * textScale, lineHeight: 15 * textScale }]}>{answered} de {questions.length} questões respondidas</Text>
            <Text style={[local.progressPercent, { fontSize: 12 * textScale, lineHeight: 16 * textScale }]}>{percent}% Concluído</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel="Questões respondidas"
            accessibilityValue={{ min: 0, max: questions.length, now: answered }} style={[local.track, { marginTop: 6 * scale }]}>
            <View style={[local.fill, { width: `${percent}%` }]} />
          </View>
          {sector && period && <Text style={[local.meta, { fontSize: 12 * textScale, lineHeight: 17 * textScale }]}>Setor: {sector.nome}. Período: {period.nome}.</Text>}

          <View style={[local.blocks, { marginTop: 14 * scale }]}>
            {questionBlocks.map((block, index) => (
              <ReviewBlock key={block.title} block={block} index={index} answers={answers} expanded={!!expanded[block.title]} disabled={submissionLocked}
                onToggle={() => setExpanded(previous => ({ ...previous, [block.title]: !previous[block.title] }))}
                onEdit={id => { if (!submissionLocked) run(() => router.push({ pathname: '/questionnaire', params: { questionId: id, fromReview: 'true' } })); }} />
            ))}
          </View>
          {!complete && <Text accessibilityRole="alert" style={[body, local.warning]}>Faltam {questions.length - answered} respostas. Abra os blocos indicados e toque nas questões não respondidas para completar. Um questionário incompleto não pode avançar para a confirmação.</Text>}
          <View style={local.spacer} />
          {!!submissionError && <Text accessibilityRole="alert" style={[body, local.warning]}>{submissionError}</Text>}
          {submissionLocked && !success && <Text style={[body, local.note]}>A tentativa mantém as mesmas respostas para evitar duplicação. Use Tentar novamente se a confirmação não chegar.</Text>}
          {isSubmitting && (
            <View style={local.loadingRow}>
              {ActivityIndicator && <ActivityIndicator size="small" color={colors.primary} />}
              <Text accessibilityLiveRegion="polite" style={[body, local.note, local.loadingText]}>Enviando respostas...</Text>
            </View>
          )}
          {success ? <Text accessibilityRole="alert" style={[local.progressCount, { fontSize: 14 * textScale }]}>Resposta encaminhada!</Text> : <>
            {(!sector || !period || (!!submissionError && !submissionLocked)) && <ScreenButton label="Selecionar setor e período" brand disabled={isSubmitting} scale={scale} textScale={textScale}
              onPress={() => run(() => router.dismissTo('/sector'))} marginTop={16 * scale} />}
            {!submissionLocked && <ScreenButton label={submissionStatus === 'error' ? 'Tentar novamente' : 'Continuar para confirmação'}
              displayLabel={submissionStatus === 'error' ? undefined : 'Enviar questionário'} brand
              disabled={!canContinue} onPress={() => { if (canContinue) { setLocalSubmitting(true); run(() => open('/submission-confirmation')); } }} scale={scale} textScale={textScale} marginTop={16 * scale} />}
            {submissionLocked && !success && <ScreenButton label="Voltar ao envio" brand onPress={() => run(() => open('/submission-error'))} scale={scale} textScale={textScale} marginTop={16 * scale} />}
          </>}
          {!submissionLocked && <ScreenButton label="Voltar ao questionário" brand outlined secondary disabled={isSubmitting} scale={scale} textScale={textScale} marginTop={12 * scale}
            onPress={() => run(() => router.dismissTo({ pathname: '/questionnaire', params: { fromReview: 'false' } }))} />
          }
          {discarding && <Text accessibilityRole="alert" style={[body, local.warning]}>A tentativa pode já estar gravada. Fechar descarta a chave usada para confirmar este envio; uma nova sessão poderá gerar outra participação.</Text>}
          {discarding && <ScreenButton label="Descartar tentativa e fechar" brand scale={scale} textScale={textScale} onPress={() => run(() => { resetParticipation(); router.dismissTo('/'); })} marginTop={12 * scale} />}
          <ScreenButton label="Fechar" brand outlined secondary scale={scale} textScale={textScale} marginTop={12 * scale}
            disabled={isSubmitting} onPress={() => {
              if (isSubmitting) return;
              if (submissionLocked && !success) { setDiscarding(true); return; }
              run(() => { resetParticipation(); router.dismissTo('/'); });
            }} />
        </ScrollView>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.white },
  scroll: { flexGrow: 1, width: '100%' },
  title: { alignSelf: 'stretch', fontWeight: 'bold', color: colors.text },
  description: { alignSelf: 'stretch', color: colors.textMuted, marginTop: 8 },
  progressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressCount: { flexShrink: 1, color: colors.orange, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.3 },
  progressPercent: { color: colors.textMuted, fontWeight: '500' },
  track: { width: '100%', height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.orange },
  meta: { marginTop: 8, color: colors.textMuted },
  blocks: { width: '100%' },
  warning: { width: '100%', marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: colors.orange, color: '#9A3412' },
  note: { width: '100%', marginTop: 12, color: colors.textMuted },
  loadingRow: { width: '100%', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { marginTop: 0, flexShrink: 1 },
  spacer: { flexGrow: 1, minHeight: 20 },
});
