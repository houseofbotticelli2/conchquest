import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Dots({ step }: { step: number }) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: t.bg }]}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            borderRadius: i === step ? 4 : 3,
            backgroundColor: i === step ? t.accent : t.border,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
});
