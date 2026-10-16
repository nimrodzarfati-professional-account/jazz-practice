import { TextStyle } from 'react-native';

export const fontFamilies = {
  heading: 'Fraunces_700Bold',
  headingItalic: 'Fraunces_700Bold_Italic',
  display: 'Fraunces_900Black',
  stamp: 'Oswald_700Bold',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
} as const;

export const colors = {
  // Core V2 All-Cream Vintage Press Palette
  inkBlack: '#181512',          // Hard stamp ink / borders / deep shadows
  cardSurface: '#F4EFE6',       // Warm Aged Manuscript Paper / Index card
  recessedSurface: '#DDD2BC',   // Recessed tone well
  canvasBg: '#16110E',          // Deep Mahogany background
  primary: '#D95D39',           // Autumn Burnt Sienna
  secondary: '#9E2A2B',         // Vintage Oxblood
  tertiary: '#D49B35',          // Saxophone Brass / Amber
  inkMuted: '#7A6B5D',          // Faded Tan / Muted ink

  // Legacy & Semantic Aliases
  bgPrimary: '#16110E',
  bgSurface: '#241B16',
  bgCard: '#F4EFE6',
  bgCardDark: '#2E221A',
  accentPrimary: '#D95D39',
  accentSecondary: '#D49B35',
  accentTertiary: '#6B705C',
  accentAlert: '#9E2A2B',
  textPrimary: '#F4EFE6',
  textSecondary: '#A69686',
  textDark: '#181512',
  textMuted: '#7A6B5D',
  border: '#181512',
  borderLight: '#3A2F26',
  shadowHard: '#0D0A08',
  soloing: '#D95D39',
  comping: '#D49B35',
  maintenance: '#6B705C',
  transcribing: '#D49B35',
  newConcept: '#D95D39',
  stamped: '#9E2A2B',
  stampedFaded: 'rgba(158, 42, 43, 0.3)',
  disabled: '#4A3D32',
  amberGlow: 'rgba(212, 155, 53, 0.15)',
  amberGlowStrong: 'rgba(212, 155, 53, 0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderWidths = {
  thin: 1,
  regular: 2,
  thick: 3,
} as const;

export function hardShadow(offset: number = 4, color: string = colors.inkBlack) {
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset,
  };
}

export const shadows = {
  card: hardShadow(4),
  cardLifted: hardShadow(6),
  button: hardShadow(3),
  buttonPressed: hardShadow(1),
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export const typography = {
  // Font Family References (Used across V2 components)
  fontStamp: fontFamilies.stamp,
  fontMonoBold: fontFamilies.monoBold,
  fontMono: fontFamilies.mono,
  fontDisplay: fontFamilies.display,
  fontHeading: fontFamilies.heading,

  // Text Styles
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  } as TextStyle,
  headingLarge: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  } as TextStyle,
  headingMedium: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  } as TextStyle,
  headingSmall: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  } as TextStyle,
  stampLarge: {
    fontFamily: fontFamilies.stamp,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  } as TextStyle,
  stampSmall: {
    fontFamily: fontFamilies.stamp,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  } as TextStyle,
  monoLarge: {
    fontFamily: fontFamilies.mono,
    fontSize: 40,
    lineHeight: 48,
    color: colors.accentSecondary,
  } as TextStyle,
  monoMedium: {
    fontFamily: fontFamilies.mono,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textSecondary,
  } as TextStyle,
  monoSmall: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  } as TextStyle,
  body: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  } as TextStyle,
  bodySmall: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  } as TextStyle,
  label: {
    fontFamily: fontFamilies.stamp,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  } as TextStyle,
} as const;
