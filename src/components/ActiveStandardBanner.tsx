import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ActiveStandard } from '../types/models';
import { useTheme } from '../theme/ThemeContext';

interface ActiveStandardBannerProps {
  standard: ActiveStandard;
  onPressRotate: () => void;
}

export const ActiveStandardBanner: React.FC<ActiveStandardBannerProps> = ({
  standard,
  onPressRotate,
}) => {
  const { colors, typography } = useTheme();

  const startedDate = standard?.startedAt ? new Date(standard.startedAt) : new Date();
  const now = new Date();
  const diffTime = now.getTime() - startedDate.getTime();
  const daysElapsed = Number.isNaN(diffTime)
    ? 1
    : Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const isDueToRotate = daysElapsed >= (standard?.rotationCycleDays || 14);

  const handleRotatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressRotate();
  };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.recessedSurface,
          borderColor: colors.inkBlack,
        },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.badgeRow}>
          <Text
            style={[
              styles.label,
              { fontFamily: typography.fontStamp, color: colors.primary },
            ]}
          >
            MAINT. STANDARD ({standard?.defaultKey || 'N/A'})
          </Text>
          <Text
            style={[
              styles.dayCounter,
              {
                fontFamily: typography.fontMonoBold,
                color: isDueToRotate ? colors.secondary : colors.inkMuted,
              },
            ]}
          >
            • DAY {daysElapsed}/{standard?.rotationCycleDays || 14}
            {isDueToRotate ? ' (DUE TO ROTATE)' : ''}
          </Text>
        </View>
        <Text
          style={[
            styles.tuneTitle,
            { fontFamily: typography.fontDisplay, color: colors.inkBlack },
          ]}
        >
          “{standard?.title || 'No standard chosen'}”
        </Text>
      </View>

      <Pressable
        onPress={handleRotatePress}
        style={[
          styles.rotateBtn,
          {
            backgroundColor: isDueToRotate ? colors.secondary : colors.cardSurface,
            borderColor: colors.inkBlack,
          },
        ]}
      >
        <Text
          style={[
            styles.rotateBtnText,
            {
              fontFamily: typography.fontStamp,
              color: isDueToRotate ? colors.cardSurface : colors.inkBlack,
            },
          ]}
        >
          ↻ SWITCH TUNE
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 2,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  dayCounter: {
    fontSize: 11,
  },
  tuneTitle: {
    fontSize: 17,
    marginTop: 2,
  },
  rotateBtn: {
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rotateBtnText: {
    fontSize: 11,
    letterSpacing: 1,
  },
});
