import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForecastStackParamList } from './types';
import { Score } from '../screens/forecast/Score';
import { Detail } from '../screens/forecast/Detail';
import { ConditionsDetail } from '../screens/forecast/ConditionsDetail';

const Stack = createNativeStackNavigator<ForecastStackParamList>();

export function ForecastStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Score" component={Score} />
      <Stack.Screen name="Detail" component={Detail} />
      <Stack.Screen name="ConditionsDetail" component={ConditionsDetail} />
    </Stack.Navigator>
  );
}
