import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { AuthProvider } from './src/auth/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { setupNotificationTapHandler } from './src/lib/notifications';

export default function App() {
  const [fontsLoaded] = useFonts({
    // Figtree carries the whole UI -- hierarchy comes from weight, not from
    // mixing typefaces. Fraunces survives only as the "Conchquest" wordmark
    // on the welcome screen, for brand continuity with the website.
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_800ExtraBold,
    Fraunces_700Bold,
  });

  useEffect(() => setupNotificationTapHandler(), []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F2ECE4' }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
