// Exact token values pulled from the Conchquest design prototype's
// palette() method (Conchquest Phone.dc.html) — keep these in sync with
// that file if the design system changes.

export interface ThemeTokens {
  frameDark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  body: string;
  muted: string;
  border: string;
  borderSoft: string;
  accent: string;
  accentDeep: string;
  sea: string;
  navBg: string;
  navText: string;
  darkCardBg: string;
  darkCardText: string;
  darkCardMuted: string;
  ringTrack: string;
  inputBg: string;
  badgeRareBg: string;
  badgeRareFg: string;
  badgeUncBg: string;
  badgeUncFg: string;
  badgeComBg: string;
  badgeComFg: string;
  iconRare: string;
  iconUnc: string;
  iconCom: string;
}

export const pearlAndTide: ThemeTokens = {
  frameDark: false,
  bg: '#F2ECE4',
  surface: '#ffffff',
  surfaceAlt: '#E7DED0',
  text: '#0F2A3D',
  body: '#3A4D57',
  muted: '#B0A084',
  border: '#C9B896',
  borderSoft: '#E7DED0',
  accent: '#D97A82',
  accentDeep: '#B85862',
  sea: '#6E9E93',
  navBg: '#0F2A3D',
  navText: '#F2ECE4',
  darkCardBg: '#0F2A3D',
  darkCardText: '#F2ECE4',
  darkCardMuted: '#C9B896',
  ringTrack: '#E7DED0',
  inputBg: '#ffffff',
  badgeRareBg: '#F5E6E8',
  badgeRareFg: '#B85862',
  badgeUncBg: '#EDF3F2',
  badgeUncFg: '#3D6B64',
  badgeComBg: '#E7DED0',
  badgeComFg: '#3A4D57',
  iconRare: '#F5E6E8',
  iconUnc: '#EDF3F2',
  iconCom: '#E7DED0',
};

export const deepTide: ThemeTokens = {
  frameDark: true,
  bg: '#0F2A3D',
  surface: '#173B4F',
  surfaceAlt: '#123243',
  text: '#F2ECE4',
  body: '#B9C7CE',
  muted: '#7C97A3',
  border: '#2A4E60',
  borderSoft: '#1E4356',
  accent: '#E08A92',
  accentDeep: '#EBA0A7',
  sea: '#8FB8AD',
  navBg: '#081E2B',
  navText: '#F2ECE4',
  darkCardBg: '#081E2B',
  darkCardText: '#F2ECE4',
  darkCardMuted: '#9DB0B9',
  ringTrack: '#1E4356',
  inputBg: '#173B4F',
  badgeRareBg: '#3A2530',
  badgeRareFg: '#EBA0A7',
  badgeUncBg: '#123A38',
  badgeUncFg: '#8FB8AD',
  badgeComBg: '#123243',
  badgeComFg: '#B9C7CE',
  iconRare: '#3A2530',
  iconUnc: '#123A38',
  iconCom: '#123243',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'PublicSans_400Regular',
  bodyMedium: 'PublicSans_500Medium',
  bodySemiBold: 'PublicSans_600SemiBold',
  data: 'IBMPlexMono_500Medium',
  dataSemiBold: 'IBMPlexMono_600SemiBold',
};

export function scoreColor(score: number, t: ThemeTokens): string {
  if (score >= 70) return t.accent;
  if (score >= 40) return '#D9B36C';
  return '#A9B9A0';
}
