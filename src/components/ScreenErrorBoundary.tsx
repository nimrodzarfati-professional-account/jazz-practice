/**
 * ScreenErrorBoundary — Resilient Crash Fallback for Screen Renders
 *
 * Catches unhandled render errors in any screen (e.g. CODEX, LIBRARY, TODAY)
 * and displays a styled 1959 Blue Note recovery card rather than crashing
 * into an unrecoverable blank white screen.
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { StampButton } from './StampButton';
import { CreamBlock } from './CreamBlock';

interface ScreenErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  resetKey?: any; // Automatically reset when this key changes (e.g. tab change)
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorFallbackView: React.FC<{
  error: Error | null;
  onReset: () => void;
  title?: string;
}> = ({ error, onReset, title }) => {
  const { colors, typography } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.canvasBg }]}
    >
      <CreamBlock>
        <View style={styles.cardContent}>
          <View style={[styles.headerRibbon, { borderBottomColor: colors.secondary }]}>
            <Text style={[typography.stamp, { color: colors.secondary }]}>
              [ NOTICE • RENDER INTERRUPT ]
            </Text>
            <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
              BLUE NOTE CODEX
            </Text>
          </View>

          <Text style={[typography.title, styles.title, { color: colors.inkBlack }]}>
            {title || 'Something hit an unexpected note.'}
          </Text>

          <Text style={[typography.mono, styles.explanation, { color: colors.inkMuted }]}>
            The screen encountered an unexpected condition during render. Your data is safely stored in the local vault and cloud mirror.
          </Text>

          {error?.message ? (
            <View
              style={[
                styles.errorBox,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor: colors.recessedSurface,
                },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkMuted, marginBottom: 4 }]}>
                DIAGNOSTIC TRACE:
              </Text>
              <Text
                selectable
                style={[typography.mono, styles.errorMessage, { color: colors.secondary }]}
              >
                {error.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <StampButton
              label="RETRY SCREEN ↺"
              variant="primary"
              size="sm"
              onPress={onReset}
            />
          </View>
        </View>
      </CreamBlock>
    </ScrollView>
  );
};

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, State> {
  constructor(props: ScreenErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ScreenErrorBoundary] Screen render failed:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ScreenErrorBoundaryProps): void {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.handleReset();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallbackView
          error={this.state.error}
          onReset={this.handleReset}
          title={this.props.fallbackTitle}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  cardContent: {
    gap: 12,
  },
  headerRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 6,
  },
  title: {
    fontSize: 20,
    marginTop: 4,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    borderWidth: 1.5,
    padding: 10,
    marginVertical: 4,
  },
  errorMessage: {
    fontSize: 11,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
});
