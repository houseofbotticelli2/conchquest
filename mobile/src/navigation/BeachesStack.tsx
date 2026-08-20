import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BeachesStackParamList } from './types';
import { Beaches } from '../screens/beaches/Beaches';
import { BeachEdit } from '../screens/beaches/BeachEdit';

const Stack = createNativeStackNavigator<BeachesStackParamList>();

export function BeachesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Beaches" component={Beaches} />
      <Stack.Screen name="BeachEdit" component={BeachEdit} />
    </Stack.Navigator>
  );
}
