import { TextStyle } from 'react-native';

export const colors = {
  // Backgrounds
  bgPrimary: '#16110E',       // Deep Mahogany / Espresso
  bgSurface: '#241B16',       // Smoky Walnut
  bgCard: '#E8DCC4',          // Aged Manuscript Paper
  bgCardDark: '#2E221A',      // Darker card variant

  // Accents
  accentPrimary: '#D95D39',   // Autumn Burnt Sienna
  accentSecondary: '#D49B35', // Saxophone Brass / Warm Amber
  accentTertiary: '#6B705C',  // Autumn Olive / Tweed
  accentAlert: '#9E2A2B',     // Vintage Oxblood

  // Text
  textPrimary: '#F4EFE6',     // Warm Cream
  textSecondary: '#A69686',   // Faded Tan
  textDark: '#1A1412',        // Dark ink (on light cards)
  textMuted: '#7A6B5D',       // Muted label text

  // Borders & Shadows
  border: '#181512',          // Hard border color
  borderLight: '#3A2F26',     // Subtle border for dark surfaces
  shadowHard: '#0D0A08',      // Hard offset shadow color

  // Semantic
  soloing: '#D95D39',         // Burnt Sienna for Soloing context
  comping: '#D49B35',         // Brass for Comping context
  maintenance: '#6B705C',     // Olive for Maintenance category
  transcribing: '#D49B35',    // Brass for Transcribing category
  newConcept: '#D95D39',      // Sienna for New Concept category

  // States
  stamped: '#9E2A2B',         // Ink stamp color (Oxblood)
  stampedFaded: 'rgba(158, 42, 43, 0.3)', // Faded stamp ghost
  disabled: '#4A3D32',        // Disabled elements

  // Aliases for convenience across components
  primary: '#D95D39',
  secondary: '#D49B35',
  tertiary: '#6B705C',
  alert: '#9E2A2B',
  surface: '#241B16',
  card: '#E8DCC4',
  background: '#16110E',
  text: '#F4EFE6',

  // Warm glow
  amberGlow: 'rgba(212, 155, 53, 0.15)', // Amber backlight glow
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

/** Hard offset shadow helper (vintage press style, no blur) */
export function hardShadow(offset: number = 4, color: string = colors.shadowHard) {
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset,
  };
}

export const shadows = {
  // Hard offset shadows (no blur, vintage press style)
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

// Font family constants (loaded via @expo-google-fonts)
export const fontFamilies = {
  heading: 'Fraunces_700Bold',
  headingItalic: 'Fraunces_700Bold_Italic',
  display: 'Fraunces_900Black',
  stamp: 'Oswald_700Bold',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // Base families
  mono: {
    fontFamily: fontFamilies.mono,
    color: colors.textPrimary,
  },
  stamp: {
    fontFamily: fontFamilies.stamp,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  heading: {
    fontFamily: fontFamilies.heading,
    color: colors.textPrimary,
  },
  // Display - album cover title size
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  // Heading - exercise titles
  headingLarge: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  headingMedium: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  headingSmall: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  // Stamp - Blue Note category badges (uppercase, wide tracking)
  stampLarge: {
    fontFamily: fontFamilies.stamp,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  stampSmall: {
    fontFamily: fontFamilies.stamp,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  // Mono - typewriter / tape counter
  monoLarge: {
    fontFamily: fontFamilies.mono,
    fontSize: 40,
    lineHeight: 48,
    color: colors.accentSecondary,
  },
  monoMedium: {
    fontFamily: fontFamilies.mono,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  monoSmall: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  // Body text
  body: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  // Labels
  label: {
    fontFamily: fontFamilies.stamp,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
} as const;
