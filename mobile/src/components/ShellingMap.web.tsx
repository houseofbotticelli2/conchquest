import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import type { ShellingMapProps } from './ShellingMap';

// react-native-maps has no web target -- Metro picks this file over
// ShellingMap.tsx when bundling for web, so the native module is never
// imported (and never crashes) in the browser preview.
export function ShellingMap({ style, fallback }: ShellingMapProps) {
  return <View style={[styles.wrap, style] as StyleProp<ViewStyle>}>{fallback}</View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%' },
});
