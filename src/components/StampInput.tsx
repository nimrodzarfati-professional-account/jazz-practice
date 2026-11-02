import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface StampInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  secure?: boolean;
}

export const StampInput: React.FC<StampInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numeric = false,
  secure = false,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View>
      {label ? (
        <Text style={[typography.stamp, styles.label, { color: colors.inkBlack }]}>{label}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        multiline={multiline}
        keyboardType={numeric ? 'numeric' : 'default'}
        secureTextEntry={secure}
        autoCapitalize={secure ? 'none' : 'sentences'}
        autoCorrect={!secure}
        style={[
          typography.mono,
          styles.input,
          multiline && styles.multiline,
          {
            borderColor: colors.inkBlack,
            backgroundColor: colors.cardSurface,
            color: colors.textDark,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
  },
  input: {
    fontSize: 13,
    borderWidth: 1.5,
    padding: 8,
    minHeight: 40,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
