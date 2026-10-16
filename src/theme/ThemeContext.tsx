import React, { createContext, useContext, ReactNode } from 'react';
import { useFonts, Fraunces_700Bold, Fraunces_700Bold_Italic, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { Oswald_700Bold } from '@expo-google-fonts/oswald';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';
import * as SplashScreen from 'expo-splash-screen';
import { colors, spacing, borderWidths, shadows, fontFamilies, typography } from './tokens';

SplashScreen.preventAutoHideAsync();

export interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  borderWidths: typeof borderWidths;
  shadows: typeof shadows;
  fontFamilies: typeof fontFamilies;
  typography: typeof typography;
}

const theme: Theme = {
  colors,
  spacing,
  borderWidths,
  shadows,
  fontFamilies,
  typography,
};

const ThemeContext = createContext<Theme>(theme);

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

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
