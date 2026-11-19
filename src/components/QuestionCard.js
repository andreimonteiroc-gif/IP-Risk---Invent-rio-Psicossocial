import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useScreenMetrics } from './ScreenLayout';

/** @param {{ question: import('../data/questions').Question, selectedAnswer?: string, onSelect: (answer: string) => void }} props */
export default function QuestionCard({ question, selectedAnswer, onSelect }) {
  const { scale = 1, textScale = 1 } = useScreenMetrics();
  return (
    <View style={local.container}>
      <Text
        accessibilityRole="header"
        style={[
          local.question,
          {
            marginTop: 18 * scale,
            fontSize: 16 * textScale,
            lineHeight: 22 * textScale,
          },
        ]}
      >
        {question.text}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={question.text}
        style={[local.options, { marginTop: 18 * scale, gap: 10 * scale }]}
      >
        {question.alternatives.map(answer => {
          const selected = selectedAnswer === answer;
          return (
            <Pressable
              key={answer}
              accessibilityRole="radio"
              accessibilityLabel={answer}
              accessibilityState={{ checked: selected }}
              onPress={() => onSelect(answer)}
              style={[
                local.option,
                {
                  minHeight: Math.max(48, 48 * scale),
                  paddingVertical: 13 * scale,
                  paddingHorizontal: 16 * scale,
                  borderRadius: 12 * scale,
                },
                selected && local.selected,
              ]}
            >
              <Text
                style={[
                  local.answer,
                  { fontSize: 14 * textScale, lineHeight: 20 * textScale },
                  selected && local.selectedText,
                ]}
              >
                {answer}
              </Text>
              <View
                accessible={false}
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  local.circle,
                  {
                    width: 22 * scale,
                    height: 22 * scale,
                    borderRadius: 11 * scale,
                  },
                  selected && local.selectedCircle,
                ]}
              >
                {selected && (
                  <Text style={[local.check, { fontSize: 13 * textScale, lineHeight: 16 * textScale }]}>
                    ✓
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: {
    width: '100%',
  },
  question: {
    color: '#15242B',
    fontWeight: '600',
    textAlign: 'left',
  },
  options: {
    width: '100%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.06)',
  },
  selected: {
    backgroundColor: '#F25C19',
    borderColor: '#F25C19',
    boxShadow: '0px 2px 6px rgba(242, 92, 25, 0.25)',
  },
  answer: {
    flex: 1,
    color: '#334155',
    fontWeight: '500',
    textAlign: 'left',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  circle: {
    borderWidth: 1.5,
    borderColor: '#E2A890',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  check: {
    color: '#F25C19',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
