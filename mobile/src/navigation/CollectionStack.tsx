import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CollectionStackParamList } from './types';
import { MyShells } from '../screens/collection/MyShells';

const Stack = createNativeStackNavigator<CollectionStackParamList>();

export function CollectionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyShells" component={MyShells} />
    </Stack.Navigator>
  );
}
