/**
 * Shed Engine — Main App Entrypoint
 * 
 * Authentic "Autumn Vibe, Old-School Jazz" Practice System:
 * - Reid Miles / Blue Note typography and tactile studio hardware aesthetic
 * - 3 Primary Screens:
 *   1. [ THE SHED ] (Active Practice Console with tape timer & vinyl spinner)
 *   2. [ THE CRATE ] (Exercise Vault & Frictionless Ingestion)
 *   3. [ CALL SHEET ] (Booking Sheet, Audible Mixing Faders & Hard OS Alarms)
 * - Offline-First SQLite with Supabase Cloud Sync
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TheShedScreen } from './src/screens/TheShedScreen';
import { TheCrateScreen } from './src/screens/TheCrateScreen';
import { TheCallSheetScreen } from './src/screens/TheCallSheetScreen';
import { Exercise, PracticeSession } from './src/types/models';

type TabRoute = 'shed' | 'crate' | 'callsheet';

function AppNavigator() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabRoute>('shed');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);

  const handleSelectFromCrate = (ex: Exercise) => {
    setActiveExercise(ex);
    setActiveTab('shed');
  };

  const handleStartFromCallSheet = (session: PracticeSession) => {
    setActiveSession(session);
    setActiveTab('shed');
  };

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar style="light" />

      {/* Screen View */}
      <View style={styles.screenContainer}>
        {activeTab === 'shed' && (
          <TheShedScreen
            onNavigateToCrate={() => setActiveTab('crate')}
            onNavigateToCallSheet={() => setActiveTab('callsheet')}
          />
        )}
        {activeTab === 'crate' && (
          <TheCrateScreen
            onSelectExercise={handleSelectFromCrate}
            onNavigateToShed={() => setActiveTab('shed')}
          />
        )}
        {activeTab === 'callsheet' && (
          <TheCallSheetScreen
            onStartSession={handleStartFromCallSheet}
            onNavigateToShed={() => setActiveTab('shed')}
          />
        )}
      </View>

      {/* Blue Note Master Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'shed' && styles.navTabActive]}
          onPress={() => setActiveTab('shed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'shed' && styles.navTabTextActive]}>
            [ THE SHED ]
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'crate' && styles.navTabActive]}
          onPress={() => setActiveTab('crate')}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'crate' && styles.navTabTextActive]}>
            [ THE CRATE ]
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'callsheet' && styles.navTabActive]}
          onPress={() => setActiveTab('callsheet')}
          activeOpacity={0.8}
        >
          <Text style={[styles.navTabText, activeTab === 'callsheet' && styles.navTabTextActive]}>
            [ CALL SHEET ]
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A2F26',
    backgroundColor: '#16110E',
  },
  navTabActive: {
    borderColor: '#D49B35',
    backgroundColor: '#2A2018',
    borderBottomWidth: 3,
    borderBottomColor: '#D95D39',
  },
  navTabText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#A69686',
  },
  navTabTextActive: {
    color: '#D49B35',
  },
});
