import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface ShellIconProps {
  size: number;
  color: string;
  filled?: boolean;
}

// A scallop shell (fan + hinge + radiating ribs) -- none of the bundled icon
// sets (Ionicons, MaterialCommunityIcons, FontAwesome, etc.) have an actual
// seashell glyph, so this is hand-drawn to match the tab bar's existing
// filled/outline weight convention (bolder stroke when active).
export function ShellIcon({ size, color, filled }: ShellIconProps) {
  const strokeWidth = filled ? 2.1 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20C7 20 4 16.5 4 11C4 6 8 3 12 3C16 3 20 6 20 11C20 16.5 17 20 12 20Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path d="M12 20L5.5 11.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 20L8.5 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 20L12 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 20L15.5 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 20L18.5 11.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
