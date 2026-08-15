import React, { useEffect } from 'react';
import { View, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingStack } from './OnboardingStack';
import { MainTabs } from './MainTabs';
import { LogStack } from './LogStack';
import { navigationRef } from './navigationRef';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { parseAuthDeepLink } from '../lib/deepLinks';
import { ResetPasswordScreen } from '../screens/onboarding/ResetPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, loading, isPasswordRecovery, beginPasswordRecovery } = useAuth();
  const { theme: t } = useTheme();

  // Handles the Universal Links recovery link (#94) both cold (app not
  // running -- getInitialURL) and warm (app already open -- the 'url'
  // event). Non-auth links (or a link with no recognizable token/type) are
  // silently ignored here rather than erroring, since this listener fires
  // for any deep link into the app, not just auth ones.
  useEffect(() => {
    function handleUrl(url: string) {
      const parsed = parseAuthDeepLink(url);
      if (!parsed || parsed.type !== 'recovery') return;
      beginPasswordRecovery(parsed.accessToken, parsed.refreshToken);
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [beginPasswordRecovery]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isPasswordRecovery ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="LogModal"
              component={LogStack}
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
