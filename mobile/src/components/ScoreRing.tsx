import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, scoreColor } from '../theme/tokens';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 140 }: ScoreRingProps) {
  const { theme: t } = useTheme();
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score, t);
  const label = score >= 70 ? 'Prime' : score >= 40 ? 'Fair' : 'Poor';

  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="60" cy="60" r={r} fill="none" stroke={t.ringTrack} strokeWidth={10} />
        <Circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={styles.overlay}>
        <Text style={[styles.score, { color: t.text, fontSize: size === 140 ? 36 : 28 }]}>{score}</Text>
        <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontFamily: fonts.displayBold,
    lineHeight: undefined,
  },
  label: {
    fontFamily: fonts.data,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
