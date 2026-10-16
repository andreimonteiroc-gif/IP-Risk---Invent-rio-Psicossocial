import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenMetrics } from './ScreenLayout';

/** @param {{ question: import('../data/questions').Question, selectedAnswer?: string, onSelect: (answer: string) => void }} props */
export default function QuestionCard({ question, selectedAnswer, onSelect }) {
  const { scale, textScale } = useScreenMetrics();
  return (
    <View style={local.container}>
      <Text style={[local.dimension, question.polarity === null && local.exposureDimension, { fontSize: 12 * textScale, lineHeight: 16 * textScale }]}>{question.dimension}</Text>
      <Text accessibilityRole="header" style={[local.question, { marginTop: 22 * scale, fontSize: 23 * textScale, lineHeight: 28 * textScale }]}>{question.text}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={question.text} style={[local.options, { marginTop: 36 * scale, gap: 12 * scale }]}>
        {question.alternatives.map(answer => {
          const selected = selectedAnswer === answer;
          return (
            <Pressable key={answer} accessibilityRole="radio" accessibilityLabel={answer}
              accessibilityState={{ checked: selected }} onPress={() => onSelect(answer)}
              style={[local.option, { minHeight: Math.max(52, 58 * scale) }, selected && local.selected]}>
              <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[local.box, selected && local.selectedBox]}>
                {selected && <Text style={local.check}>✓</Text>}
              </View>
              <Text style={[local.answer, { fontSize: 16 * textScale, lineHeight: 21 * textScale }, selected && local.selectedText]}>{answer}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: { width: '100%' },
  dimension: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 20, backgroundColor: '#B1C8D8', color: '#20465A', fontWeight: 'bold' },
  exposureDimension: { backgroundColor: '#851D20', color: '#FFFFFF' },
  question: { color: '#101010', fontWeight: 'bold' },
  options: { width: '100%' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: '#B1C8D8', borderWidth: 2, borderColor: 'transparent' },
  selected: { backgroundColor: '#1F7E26', borderColor: '#1F7E26', boxShadow: '0px 3px 4px rgba(0, 0, 0, 0.2)' },
  box: { width: 24, height: 24, borderWidth: 1.5, borderColor: '#20465A', borderRadius: 3, backgroundColor: '#EAF3F8', alignItems: 'center', justifyContent: 'center' },
  selectedBox: { borderColor: '#FFFFFF', backgroundColor: '#1F7E26' },
  check: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  answer: { flex: 1, color: '#20465A', textAlign: 'center' },
  selectedText: { color: '#FFFFFF' },
});
