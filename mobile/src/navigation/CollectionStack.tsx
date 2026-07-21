import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CollectionStackParamList } from './types';
import { MyShells } from '../screens/collection/MyShells';
import { Library } from '../screens/library/Library';
import { Species } from '../screens/library/Species';

const Stack = createNativeStackNavigator<CollectionStackParamList>();

export function CollectionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyShells" component={MyShells} />
      <Stack.Screen name="Library" component={Library} />
      <Stack.Screen name="Species" component={Species} />
    </Stack.Navigator>
  );
}
