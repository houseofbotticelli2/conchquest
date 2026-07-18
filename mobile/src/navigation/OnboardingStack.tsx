import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { Welcome } from '../screens/onboarding/Welcome';
import { Signup } from '../screens/onboarding/Signup';
import { Perms } from '../screens/onboarding/Perms';
import { Beach } from '../screens/onboarding/Beach';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Perms" component={Perms} />
      <Stack.Screen name="Beach" component={Beach} />
    </Stack.Navigator>
  );
}
