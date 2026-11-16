import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSession } from '../session/SessionContext';
import {
  PokedexStandard,
  StandardStyle,
} from '../types/pokedex';
import { PitchKey } from '../types/models';
import {
  getPokedexStandards,
  toggleStandardCaught,
  updateStandardMasteredKeys,
  updateStandardNotes,
  addCustomStandard,
  setPokedexStandardAsActive,
  normalizeStandardTitle,
} from '../db/pokedexRepository';
import { PokedexHeader } from '../components/pokedex/PokedexHeader';
import {
  PokedexFilterBar,
  StatusFilter,
} from '../components/pokedex/PokedexFilterBar';
import { StandardCard } from '../components/pokedex/StandardCard';
import { StandardDetailModal } from '../components/pokedex/StandardDetailModal';
import { JamSessionModal } from '../components/pokedex/JamSessionModal';
import { AddStandardModal } from '../components/pokedex/AddStandardModal';

export const StandardsScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { song, reloadFromDb } = useSession();

  const [standards, setStandards] = useState<PokedexStandard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [styleFilter, setStyleFilter] = useState<'ALL' | StandardStyle>('ALL');
  const [keyFilter, setKeyFilter] = useState<'ALL' | PitchKey>('ALL');

  // Modals
  const [selectedStandard, setSelectedStandard] = useState<PokedexStandard | null>(null);
  const [showJamModal, setShowJamModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load standards
  const refreshDex = useCallback(() => {
    const list = getPokedexStandards();
    setStandards(list);
  }, []);

  useEffect(() => {
    refreshDex();
  }, [refreshDex]);

  // Current active standard title normalized
  const activeTitleNorm = useMemo(() => {
    return normalizeStandardTitle(song?.title || '');
  }, [song]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    let caught = 0;
    let seen = 0;
    let locked = 0;
    for (const s of standards) {
      if (s.status === 'CAUGHT') caught++;
      else if (s.status === 'SEEN') seen++;
      else locked++;
    }
    return {
      all: standards.length,
      caught,
      seen,
      locked,
    };
  }, [standards]);

  const stats = useMemo(() => {
    const totalCount = standards.length;
    const caughtCount = counts.caught;
    const seenCount = counts.seen;
    const lockedCount = counts.locked;
    const completionPercentage =
      totalCount > 0 ? Math.round((caughtCount / totalCount) * 100) : 0;
    return {
      totalCount,
      caughtCount,
      seenCount,
      lockedCount,
      completionPercentage,
    };
  }, [standards, counts]);

  // Filtered standards
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return standards.filter((s) => {
      // 1. Repertoire status filter
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // 2. Style filter
      if (styleFilter !== 'ALL' && !s.types.includes(styleFilter)) {
        return false;
      }

      // 3. Key filter
      if (
        keyFilter !== 'ALL' &&
        s.defaultKey !== keyFilter &&
        !s.masteredKeys?.includes(keyFilter)
      ) {
        return false;
      }

      // 4. Search query
      if (q) {
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchComposer = s.composer.toLowerCase().includes(q);
        const matchChords = s.firstChords.toLowerCase().includes(q);
        const matchNumber = String(s.dexNumber).includes(q);
        if (!matchTitle && !matchComposer && !matchChords && !matchNumber) {
          return false;
        }
      }

      return true;
    });
  }, [standards, searchQuery, statusFilter, styleFilter, keyFilter]);

  // Actions
  const handleToggleCaught = (id: string) => {
    const updated = toggleStandardCaught(id);
    if (updated) {
      setStandards((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (selectedStandard?.id === id) {
        setSelectedStandard(updated);
      }
    }
  };

  const handleUpdateKeys = (id: string, keys: PitchKey[]) => {
    const updated = updateStandardMasteredKeys(id, keys);
    if (updated) {
      setStandards((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (selectedStandard?.id === id) {
        setSelectedStandard(updated);
      }
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    const updated = updateStandardNotes(id, notes);
    if (updated) {
      setStandards((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (selectedStandard?.id === id) {
        setSelectedStandard(updated);
      }
    }
  };

  const handleAddStandard = (
    data: Omit<PokedexStandard, 'id' | 'dexNumber'>
  ) => {
    const added = addCustomStandard(data);
    setStandards((prev) => [...prev, added]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSetAsActiveStandard = (standard: PokedexStandard) => {
    setPokedexStandardAsActive(standard, 14);
    reloadFromDb();
    refreshDex();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvasBg }]}>
      <FlatList
        data={filteredStandards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          isDesktop && styles.desktopListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <PokedexHeader
              stats={stats}
              onOpenJamCaller={() => setShowJamModal(true)}
              onOpenAddStandard={() => setShowAddModal(true)}
            />

            <PokedexFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              styleFilter={styleFilter}
              onStyleChange={setStyleFilter}
              keyFilter={keyFilter}
              onKeyChange={setKeyFilter}
              counts={counts}
            />

            {/* Repertoire Summary Pill */}
            <View style={styles.resultsInfoRow}>
              <Text style={[typography.monoBold, styles.resultsInfoText, { color: colors.inkMuted }]}>
                SHOWING {filteredStandards.length} OF {standards.length} STANDARDS
              </Text>
              {(statusFilter !== 'ALL' || styleFilter !== 'ALL' || keyFilter !== 'ALL' || searchQuery) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset filters"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setStyleFilter('ALL');
                    setKeyFilter('ALL');
                  }}
                >
                  <Text style={[typography.monoBold, styles.resetBtnText, { color: colors.primary }]}>
                    RESET FILTERS ✕
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = normalizeStandardTitle(item.title) === activeTitleNorm;
          return (
            <StandardCard
              standard={item}
              isActiveCurrentWeek={isActive}
              onPress={() => setSelectedStandard(item)}
              onToggleCaught={() => handleToggleCaught(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.cardSurface,
                borderColor: colors.inkBlack,
              },
            ]}
          >
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[typography.title, styles.emptyTitle, { color: colors.inkBlack }]}>
              NO STANDARDS FOUND
            </Text>
            <Text style={[typography.mono, styles.emptyText, { color: colors.inkMuted }]}>
              No jazz tunes match your current search and filter settings.
            </Text>
            <Pressable
              style={[
                styles.emptyActionBtn,
                { backgroundColor: colors.primary, borderColor: colors.inkBlack },
              ]}
              onPress={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setStyleFilter('ALL');
                setKeyFilter('ALL');
              }}
            >
              <Text style={[typography.stamp, { color: colors.onDark }]}>
                SHOW ALL STANDARDS
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* Standard Detail Modal */}
      <StandardDetailModal
        standard={selectedStandard}
        visible={!!selectedStandard}
        onClose={() => setSelectedStandard(null)}
        onToggleCaught={handleToggleCaught}
        onUpdateKeys={handleUpdateKeys}
        onUpdateNotes={handleUpdateNotes}
        onSetAsActiveStandard={handleSetAsActiveStandard}
        isActiveStandard={
          selectedStandard
            ? normalizeStandardTitle(selectedStandard.title) === activeTitleNorm
            : false
        }
      />

      {/* Jam Session Caller Modal ("I CHOOSE YOU!") */}
      <JamSessionModal
        visible={showJamModal}
        standards={standards}
        onClose={() => setShowJamModal(false)}
        onSetAsActiveStandard={handleSetAsActiveStandard}
        onOpenStandardDetail={(std) => setSelectedStandard(std)}
      />

      {/* Add Custom Standard Modal */}
      <AddStandardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStandard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  desktopListContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsInfoText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  resetBtnText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyCard: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyActionBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
