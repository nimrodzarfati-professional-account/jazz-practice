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
  olive: '#6B705C',             // Maintenance olive
  inkMuted: '#5E5146',          // Faded Tan / Muted ink

  // Text on fills
  onAccent: '#181512',          // Dark ink text on sienna / brass / olive fills
  onDark: '#F4EFE6',            // Cream text on oxblood / ink fills
  scrim: 'rgba(0,0,0,0.72)',    // Modal backdrop

  // Semantic Aliases
  textPrimary: '#F4EFE6',
  textDark: '#181512',
  shadowHard: '#0D0A08',
  disabled: '#4A3D32',
} as const;

export const warmColors = {
  // Autumn Dark Brown Palette
  inkBlack: '#E8DFD3',          // Light cream ink for dark cards
  cardSurface: '#2E221A',       // Rich warm brown
  recessedSurface: '#1F1711',   // Darker recessed brown
  canvasBg: '#120D0A',          // Very dark roasted bean
  primary: '#C86B3E',           // Burnt orange / Autumn leaf
  secondary: '#8C382A',         // Muted oxblood / Maple
  tertiary: '#B8863A',          // Aged brass / Amber
  olive: '#7E8468',             // Maintenance olive
  inkMuted: '#A89888',          // Warm grey/brown

  // Text on fills
  onAccent: '#181512',
  onDark: '#F4EFE6',
  scrim: 'rgba(0,0,0,0.72)',

  // Semantic Aliases
  textPrimary: '#E8DFD3',
  textDark: '#E8DFD3',          // Readable light text inside inputs on dark cards
  shadowHard: '#080504',
  disabled: '#362A21',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  card: 14,
} as const;

export const borderWidths = {
  thin: 1,
  hairline: 1.5,
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

  // Text presets (no colour; combine with a theme colour at the call site)
  title: { fontFamily: fontFamilies.display, fontSize: 20, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamilies.heading, fontSize: 15 },
  stamp: { fontFamily: fontFamilies.stamp, fontSize: 11, letterSpacing: 1.2 },
  stampSmall: { fontFamily: fontFamilies.stamp, fontSize: 10, letterSpacing: 1 },
  mono: { fontFamily: fontFamilies.mono, fontSize: 12 },
  monoBold: { fontFamily: fontFamilies.monoBold, fontSize: 12 },
  digits: { fontFamily: fontFamilies.monoBold, fontSize: 32, letterSpacing: 1.5 },
} as const;
