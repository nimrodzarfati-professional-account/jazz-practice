import { useWindowDimensions } from 'react-native';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWideDesktop: boolean;
  contentMaxWidth: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 960;
  const isWideDesktop = width >= 1360;
  const isTablet = width >= 640 && width < 960;
  const isMobile = width < 640;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWideDesktop,
    contentMaxWidth: 1280,
  };
}