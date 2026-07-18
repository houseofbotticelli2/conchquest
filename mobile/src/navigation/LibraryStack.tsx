import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryStackParamList } from './types';
import { Library } from '../screens/library/Library';
import { Species } from '../screens/library/Species';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Library" component={Library} />
      <Stack.Screen name="Species" component={Species} />
    </Stack.Navigator>
  );
}
