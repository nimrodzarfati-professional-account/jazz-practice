import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CreamBlockProps {
  children: ReactNode;
  style?: ViewStyle;
  shadowOffset?: number;
}

export const CreamBlock: React.FC<CreamBlockProps> = ({
  children,
  style,
  shadowOffset = 4,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { marginBottom: 14 + shadowOffset }]}>
      {/* Hard Offset Ink Shadow Block */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.inkBlack,
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
          },
        ]}
      />
      {/* Foreground Cream Index Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.inkBlack,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  card: {
    borderWidth: 2,
    borderRadius: 0,
    padding: 14,
  },
});
