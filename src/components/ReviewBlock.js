import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenMetrics } from './ScreenLayout';
import { countAnswers, isAnswered } from '../data/questionnaireReview';

/** @param {{ block: typeof import('../data/questionnaireReview').questionBlocks[number], answers: import('../data/questionnaireReview').Answers, expanded: boolean, onToggle: () => void, onEdit: (id: string) => void }} props */
export default function ReviewBlock({ block, answers, expanded, onToggle, onEdit }) {
  const { textScale } = useScreenMetrics();
  const answered = countAnswers(block.questions, answers);
  const complete = answered === block.questions.length;
  const body = { fontSize: 15 * textScale, lineHeight: 21 * textScale };
  return (
    <View style={local.block}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${block.title}, ${answered} de ${block.questions.length} respondidas`}
        accessibilityHint="Toque para mostrar ou ocultar as questões" accessibilityState={{ expanded }} onPress={onToggle} style={local.header}>
        <View accessible={false} aria-hidden style={[local.badge, complete ? local.completeBadge : local.pendingBadge]}>
          <Text style={local.symbol}>{complete ? '✓' : '!'}</Text>
        </View>
        <View style={local.content}>
          <Text style={[body, local.title]}>{block.title}</Text>
          <Text style={[body, complete ? local.complete : local.pending]}>{answered} de {block.questions.length} respondidas</Text>
        </View>
        <Text accessible={false} aria-hidden style={local.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded && block.questions.map(question => {
        const answered = isAnswered(question, answers);
        const answerText = answered ? answers[question.id] : 'Não respondida';
        return (
          <Pressable key={question.id} accessibilityRole="button"
            accessibilityLabel={`${question.id}. ${question.text} Resposta: ${answerText}. Corrigir resposta`}
            onPress={() => onEdit(question.id)} style={[local.question, !answered && local.missingQuestion]}>
            <Text style={[body, local.number]}>{question.id}</Text>
            <View style={local.content}>
              <Text style={[body, local.title]}>{question.text}</Text>
              <Text style={[body, local.answer, !answered && local.pending]}>{answerText}</Text>
              <Text style={[body, local.edit]}>Corrigir resposta →</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const local = StyleSheet.create({
  block: { width: '100%', gap: 10 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.18)' },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  completeBadge: { backgroundColor: '#1F7E26' },
  pendingBadge: { backgroundColor: '#915600' },
  symbol: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  title: { color: '#172747' },
  complete: { color: '#22632A' },
  pending: { color: '#854500', fontWeight: 'bold' },
  chevron: { color: '#20465A', fontSize: 24 },
  question: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D5E2E9' },
  missingQuestion: { borderColor: '#915600', backgroundColor: '#FFF7E8' },
  number: { color: '#22632A', fontWeight: 'bold', minWidth: 32 },
  answer: { color: '#4A5665', marginTop: 6 },
  edit: { color: '#20465A', textDecorationLine: 'underline', marginTop: 8 },
});
