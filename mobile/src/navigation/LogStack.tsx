import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogStackParamList } from './types';
import { Log } from '../screens/log/Log';
import { LogConfirm } from '../screens/log/LogConfirm';

const Stack = createNativeStackNavigator<LogStackParamList>();

export function LogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Log" component={Log} />
      <Stack.Screen name="LogConfirm" component={LogConfirm} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
