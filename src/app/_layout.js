import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QuestionnaireProvider } from '../state/QuestionnaireContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QuestionnaireProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#EAF3F8' } }} />
      </QuestionnaireProvider>
    </SafeAreaProvider>
  );
}
