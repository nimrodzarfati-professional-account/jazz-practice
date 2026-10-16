import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { useFonts, Fraunces_700Bold, Fraunces_700Bold_Italic, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { Oswald_700Bold } from '@expo-google-fonts/oswald';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';
import * as SplashScreen from 'expo-splash-screen';
import { colors, warmColors, spacing, borderWidths, shadows, fontFamilies, typography } from './tokens';

SplashScreen.preventAutoHideAsync();

export type ThemeMode = 'default' | 'warm';

export interface Theme {
  colors: typeof colors | typeof warmColors;
  spacing: typeof spacing;
  borderWidths: typeof borderWidths;
  shadows: typeof shadows;
  fontFamilies: typeof fontFamilies;
  typography: typeof typography;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const defaultTheme: Theme = {
  colors,
  spacing,
  borderWidths,
  shadows,
  fontFamilies,
  typography,
  mode: 'default',
  toggleTheme: () => {},
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Fraunces_900Black,
    Oswald_700Bold,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const [mode, setMode] = useState<ThemeMode>('default');

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'default' ? 'warm' : 'default'));
  };

  const currentTheme = useMemo(() => ({
    colors: mode === 'default' ? colors : warmColors,
    spacing,
    borderWidths,
    shadows,
    fontFamilies,
    typography,
    mode,
    toggleTheme,
  }), [mode]);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
