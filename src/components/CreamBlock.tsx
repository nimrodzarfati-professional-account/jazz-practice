/**
 * CreamBlock — Aged manuscript / index card surface
 *
 * A reusable card component with sharp edges, hard offset shadows,
 * and two variants: light (aged paper) and dark (smoky walnut).
 */
import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { colors, hardShadow } from '../theme/tokens';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CreamBlockProps {
  /** Visual variant: light = aged manuscript paper, dark = smoky walnut */
  variant: 'light' | 'dark';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true the card uses a stronger 6px offset shadow. */
  lifted?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const CreamBlock: React.FC<CreamBlockProps> = ({
  variant,
  children,
  style,
  lifted = false,
}) => {
  const backgroundColor =
    variant === 'light' ? colors.card : colors.surface;

  const shadow = hardShadow(lifted ? 6 : 4);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
  },
});

export default CreamBlock;
