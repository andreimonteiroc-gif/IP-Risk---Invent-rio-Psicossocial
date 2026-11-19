import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenMetrics } from './ScreenLayout';
import { countAnswers, isAnswered } from '../data/questionnaireReview';
import { colors } from '../theme/colors';

/** @param {{ block: typeof import('../data/questionnaireReview').questionBlocks[number], index?: number, answers: import('../data/questionnaireReview').Answers, expanded: boolean, onToggle: () => void, onEdit: (id: string) => void, disabled?: boolean }} props */
export default function ReviewBlock({ block, index, answers, expanded, onToggle, onEdit, disabled = false }) {
  const { textScale = 1 } = useScreenMetrics();
  const answered = countAnswers(block.questions, answers);
  const complete = answered === block.questions.length;
  const title = typeof index === 'number' ? `Bloco ${index + 1}: ${block.title}` : block.title;
  return (
    <View style={local.block}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${block.title}, ${answered} de ${block.questions.length} respondidas`}
        accessibilityHint="Toque para mostrar ou ocultar as questões" accessibilityState={{ expanded }} onPress={onToggle} style={local.header}>
        <View style={local.content}>
          <Text style={[local.title, { fontSize: 15 * textScale, lineHeight: 21 * textScale }]}>{title}</Text>
          <Text style={[local.count, { fontSize: 12 * textScale, lineHeight: 16 * textScale }, !complete && local.countPending]}>{answered} de {block.questions.length} respondidas</Text>
        </View>
        <Text accessible={false} aria-hidden style={local.chevron}>{expanded ? '⌄' : '›'}</Text>
      </Pressable>
      {expanded && (
        <View style={local.grid}>
          {block.questions.map(question => {
            const isDone = isAnswered(question, answers);
            const answerText = isDone ? answers[question.id] : 'Não respondida';
            return (
              <Pressable key={question.id} accessibilityRole="button"
                accessibilityLabel={`${question.id}. ${question.text} Resposta: ${answerText}. Corrigir resposta`}
                disabled={disabled} accessibilityState={{ disabled }} onPress={() => { if (!disabled) onEdit(question.id); }}
                style={[local.tile, isDone ? local.tileDone : local.tilePending]}>
                <Text style={[local.tileLabel, { fontSize: 10 * textScale, lineHeight: 13 * textScale }, isDone ? local.tileLabelDone : local.tileLabelPending]}>QUESTÃO {question.id.slice(1)}</Text>
                <View accessible={false} aria-hidden style={[local.tileIcon, isDone ? local.tileIconDone : local.tileIconPending]}>
                  {isDone && <Text style={local.tileCheck}>✓</Text>}
                </View>
                {/* Conteúdo completo (enunciado e resposta) fica disponível a leitores de tela, sem poluir o cartão compacto. */}
                <View accessible={false} aria-hidden style={local.srOnly}>
                  <Text>{question.text}</Text>
                  <Text>{answerText}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  block: { width: '100%', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  content: { flex: 1 },
  title: { color: colors.text, fontWeight: '600' },
  count: { color: colors.primary, marginTop: 2 },
  countPending: { color: colors.orange, fontWeight: 'bold' },
  chevron: { color: colors.text, fontSize: 22, minWidth: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tile: { width: '23%', minHeight: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 },
  tileDone: { backgroundColor: colors.primary },
  tilePending: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.orange },
  tileLabel: { fontWeight: 'bold', textAlign: 'center' },
  tileLabelDone: { color: colors.white },
  tileLabelPending: { color: colors.orange },
  tileIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileIconDone: { backgroundColor: colors.white },
  tileIconPending: { borderWidth: 1.5, borderColor: colors.orange },
  tileCheck: { color: colors.primary, fontSize: 13, lineHeight: 16, fontWeight: 'bold' },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
