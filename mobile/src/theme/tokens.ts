// Exact token values pulled from the Conchquest design prototype's
// palette() method (Conchquest Phone.dc.html) — keep these in sync with
// that file if the design system changes.

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeTokens {
  frameDark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  // Depth/hierarchy system (see docs -- "Conchquest Depth & Hierarchy
  // Audit"): a resting-card tone between bg and surface (light theme only --
  // dark theme has no gap to fill there, see surfaceCard's dark value), an
  // emphasized-card tone for hero/active content, and a recessed tone for
  // inputs/dropzones. Paired with three shadow levels below; dark theme
  // relies on the surface steps + borders instead of shadows, which read as
  // near-invisible on navy.
  surfaceCard: string;
  surfaceCardHi: string;
  surfaceInset: string;
  // Softened border for Level-1 cards -- "border + soft shadow together is
  // what makes 'paper on a desk.'" Navy-alpha in light theme, white-alpha
  // in dark (existing solid borders read too heavy against a shadow).
  borderSoftAlpha: string;
  shadowRaised: ShadowStyle;
  shadowFloating: ShadowStyle;
  shadowOverlay: ShadowStyle;
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

// Android only tints shadowColor on API 28+; older devices fall back to
// plain grey elevation regardless. Acceptable -- the surface-color steps
// carry the hierarchy, shadows are garnish on top, not the only signal.
const NO_SHADOW: ShadowStyle = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

export const pearlAndTide: ThemeTokens = {
  frameDark: false,
  bg: '#F2ECE4',
  surface: '#ffffff',
  surfaceAlt: '#E7DED0',
  surfaceCard: '#FBF8F3',
  surfaceCardHi: '#FFFFFF',
  surfaceInset: '#EAE2D6',
  borderSoftAlpha: 'rgba(15,42,61,0.08)',
  // Navy-tinted (not black) so shadows read warm-cool against the cream bg
  // rather than dirty grey.
  shadowRaised: { shadowColor: '#0F2A3D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 1 },
  shadowFloating: { shadowColor: '#0F2A3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  shadowOverlay: { shadowColor: '#0F2A3D', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 12 },
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
  // Reuses the existing surface/surfaceAlt steps -- they were already close
  // to right for this. surfaceInset goes the other direction (darker than
  // bg) since nothing currently fills that "recessed" role.
  surfaceCard: '#123243',
  surfaceCardHi: '#173B4F',
  surfaceInset: '#0A1F2C',
  borderSoftAlpha: 'rgba(255,255,255,0.08)',
  // Shadows read as near-invisible on navy -- the surface-color steps above
  // carry the hierarchy here instead. Sheets/overlays keep a black-based
  // shadow since it's the one place elevation still shows up against OS chrome.
  shadowRaised: NO_SHADOW,
  shadowFloating: NO_SHADOW,
  shadowOverlay: { shadowColor: '#000000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
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

// One-font app: Figtree at four weights carries everything, with hierarchy
// coming from weight rather than from mixing typefaces. IBM Plex Mono is
// gone entirely (monospace paragraphs read as terminal output and were a
// major contributor to the "flat" feel), and Fraunces survives only as
// `wordmark` -- the "Conchquest" logotype on the welcome screen, kept for
// continuity with the website's headings.
//
// The legacy key names (display/body/data/...) are retained so every screen
// keeps working; they now all resolve to Figtree weights. `data` in
// particular is no longer monospace -- pair it with tabularNums below for
// anything numeric that updates live, so digits don't jitter.
export const fonts = {
  displayXL: 'Figtree_800ExtraBold',
  display: 'Figtree_800ExtraBold',
  displayBold: 'Figtree_800ExtraBold',
  displayItalic: 'Figtree_400Regular',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  data: 'Figtree_500Medium',
  dataSemiBold: 'Figtree_600SemiBold',
  wordmark: 'Fraunces_700Bold',
};

// Figtree's proportional digits shift width as values change; live-updating
// numbers (scores, times, countdowns) need fixed-width figures so they don't
// jitter. Android needs RN 0.71+ for this -- current Expo SDK is fine.
export const tabularNums = { fontVariant: ['tabular-nums' as const] };

/**
 * Map pin colours.
 *
 * These live here, not in ShellingMap, because ShellingMap has a .web.tsx
 * variant: importing constants from it resolved to the web build on web, where
 * they don't exist, and crashed the app at module scope. Colours are data, not
 * a component -- platform-specific files should not be anyone's source for them.
 *
 * Rare is deliberately far from LOCATION_PIN_COLOR: at pin size on satellite
 * imagery a reddish rare pin is indistinguishable from "this is the spot you're
 * placing".
 */
export const LOCATION_PIN_COLOR = '#D32F2F';

export const FIND_PIN_COLORS = {
  rare: '#7B4B8A',
  uncommon: '#4A8B8C',
  common: '#D9B36C',
} as const;

export function scoreColor(score: number, t: ThemeTokens): string {
  if (score >= 70) return '#A9B9A0';
  if (score >= 40) return '#D9B36C';
  return t.accent;
}
