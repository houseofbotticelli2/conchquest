import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapStackParamList } from './types';
import { MapScreen } from '../screens/map/MapScreen';
import { FindDetail } from '../screens/map/FindDetail';
import { Species } from '../screens/library/Species';

const Stack = createNativeStackNavigator<MapStackParamList>();

export function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="FindDetail" component={FindDetail} />
      <Stack.Screen name="Species" component={Species} />
    </Stack.Navigator>
  );
}
