import { useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QuestionnaireProvider } from '../state/QuestionnaireContext';
import SplashScreen from '../screens/SplashScreen';

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <SafeAreaProvider>
      <QuestionnaireProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#EAF3F8' } }} />
        {!splashFinished && (
          <SplashScreen onFinish={() => setSplashFinished(true)} />
        )}
      </QuestionnaireProvider>
    </SafeAreaProvider>
  );
}
