import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import {
  RepertoireStandard,
  StandardStyle,
  STANDARD_STYLES,
  TOTAL_KNOWN_STANDARDS_BENCHMARK,
} from '../types/pokedex';
import { CIRCLE_OF_FIFTHS, PitchKey } from '../types/models';
import {
  getPokedexStandards,
  getPokedexStats,
  toggleStandardCaught,
  updateStandardMasteredKeys,
  updateStandardPersonalNotes,
  addCustomPokedexStandard,
  normalizeStandardTitle,
} from '../db/pokedexRepository';
import { rotateActiveStandard } from '../db/repository';
import { CreamBlock } from '../components/CreamBlock';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedStamp } from '../components/SegmentedStamp';
import { StampButton } from '../components/StampButton';
import { StampBadge } from '../components/StampBadge';
import { StampInput } from '../components/StampInput';
import { Callout } from '../components/Callout';
import { StandardDetailModal } from '../components/pokedex/StandardDetailModal';
import { AddStandardModal } from '../components/pokedex/AddStandardModal';

type RepertoireTab = 'KNOWN' | 'CATALOG';

export const StandardsScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { isDesktop, contentMaxWidth } = useResponsiveLayout();
  const { song, reloadFromDb } = useSession();

  const [standards, setStandards] = useState<RepertoireStandard[]>(() =>
    getPokedexStandards()
  );
  const [tab, setTab] = useState<RepertoireTab>(() => {
    const initial = getPokedexStandards();
    return initial.some((s) => s.isKnown) ? 'KNOWN' : 'CATALOG';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState<'ALL' | StandardStyle>('ALL');
  const [keyFilter, setKeyFilter] = useState<'ALL' | PitchKey>('ALL');

  const [suggestedTune, setSuggestedTune] = useState<RepertoireStandard | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<RepertoireStandard | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const refresh = useCallback(() => {
    const updated = getPokedexStandards();
    setStandards(updated);
    if (selectedStandard) {
      const fresh = updated.find((s) => s.id === selectedStandard.id) || null;
      setSelectedStandard(fresh);
    }
  }, [selectedStandard]);

  const stats = useMemo(() => getPokedexStats(standards), [standards]);
  const activeSongNorm = useMemo(
    () => normalizeStandardTitle(song.title),
    [song.title]
  );

  const knownMatchingPool = useMemo(() => {
    return standards.filter((s) => {
      if (!s.isKnown) return false;
      if (styleFilter !== 'ALL' && s.style !== styleFilter) return false;
      if (
        keyFilter !== 'ALL' &&
        s.defaultKey !== keyFilter &&
        !s.knownKeys.includes(keyFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [standards, styleFilter, keyFilter]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return standards.filter((s) => {
      if (tab === 'KNOWN' && !s.isKnown) return false;
      if (styleFilter !== 'ALL' && s.style !== styleFilter) return false;
      if (
        keyFilter !== 'ALL' &&
        s.defaultKey !== keyFilter &&
        !s.knownKeys.includes(keyFilter)
      ) {
        return false;
      }
      if (q) {
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchComposer = s.composer.toLowerCase().includes(q);
        const matchNotes = s.notes.toLowerCase().includes(q);
        if (!matchTitle && !matchComposer && !matchNotes) return false;
      }
      return true;
    });
  }, [standards, tab, styleFilter, keyFilter, searchQuery]);

  const handleSuggestRandom = () => {
    const pool = knownMatchingPool.length > 0 ? knownMatchingPool : standards.filter((s) => s.isKnown);
    if (pool.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (pool.length === 1) {
      setSuggestedTune(pool[0]);
      return;
    }
    const candidates = pool.filter((s) => s.id !== suggestedTune?.id);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setSuggestedTune(pick);
  };

  const handleToggleKnown = (id: string, forceKnown?: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleStandardCaught(id, forceKnown);
    refresh();
  };

  const handleSetAsActiveStandard = (std: RepertoireStandard) => {
    const cycle = (song.rotationCycleDays === 7 || song.rotationCycleDays === 10 ? song.rotationCycleDays : 14) as 7 | 10 | 14;
    rotateActiveStandard(std.title, std.defaultKey, cycle);
    toggleStandardCaught(std.id, true);
    reloadFromDb();
    refresh();
  };

  const progressPct = Math.min(
    100,
    Math.round((stats.knownCount / TOTAL_KNOWN_STANDARDS_BENCHMARK) * 1000) / 10
  );

  const renderStandardRow = ({ item }: { item: RepertoireStandard }) => {
    const isCurrentShed = normalizeStandardTitle(item.title) === activeSongNorm;
    const extraKeys = item.knownKeys.filter((k) => k !== item.defaultKey);

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.inkBlack,
          },
        ]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${item.title} as ${item.isKnown ? 'not known' : 'known'}`}
          accessibilityState={{ checked: item.isKnown }}
          onPress={() => handleToggleKnown(item.id)}
          style={styles.checkHitbox}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.inkBlack,
                backgroundColor: item.isKnown ? colors.primary : colors.recessedSurface,
              },
            ]}
          >
            {item.isKnown && (
              <Text style={[typography.monoBold, styles.checkGlyph, { color: colors.onAccent }]}>
                ✓
              </Text>
            )}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, key of ${item.defaultKey}`}
          onPress={() => setSelectedStandard(item)}
          style={styles.rowBody}
        >
          <View style={styles.rowMain}>
            <View style={styles.titleLine}>
              <Text
                style={[
                  typography.heading,
                  styles.tuneTitle,
                  { color: colors.inkBlack },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {isCurrentShed && (
                <StampBadge label="SHED SONG" tone="brass" filled />
              )}
            </View>
            <Text
              style={[typography.mono, styles.subMeta, { color: colors.inkMuted }]}
              numberOfLines={1}
            >
              {item.style}
              {item.composer ? ` • ${item.composer}` : ''}
              {item.notes ? ` • "${item.notes}"` : ''}
            </Text>
          </View>

          <View style={styles.keyColumn}>
            <StampBadge
              label={`KEY ${item.defaultKey}`}
              tone={item.isKnown ? 'primary' : 'neutral'}
              filled={item.isKnown}
            />
            {extraKeys.length > 0 && (
              <Text style={[typography.monoBold, styles.extraKeys, { color: colors.inkMuted }]}>
                +{extraKeys.join(', ')}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderStandardRow}
        initialNumToRender={20}
        maxToRenderPerBatch={25}
        windowSize={7}
        contentContainerStyle={[
          styles.listContent,
          isDesktop && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        ListHeaderComponent={
          <View>
            {/* Header & 1,500 Progress Block */}
            <CreamBlock>
              <SectionHeader
                title="STANDARDS"
                size="title"
                meta={`${stats.knownCount} / ${TOTAL_KNOWN_STANDARDS_BENCHMARK.toLocaleString()} KNOWN`}
              />

              <View
                style={[
                  styles.meterTrack,
                  { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
                ]}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${Math.max(stats.knownCount > 0 ? 1.5 : 0, progressPct)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.topActionsRow}>
                <SegmentedStamp<RepertoireTab>
                  accessibilityLabel="Standards view"
                  options={[
                    { id: 'KNOWN', label: 'MY REPERTOIRE', count: stats.knownCount },
                    {
                      id: 'CATALOG',
                      label: `1,500 CATALOG`,
                      count: standards.length,
                    },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
                <View style={styles.spacer} />
                <StampButton
                  label="SUGGEST TUNE"
                  variant="secondary"
                  size="sm"
                  disabled={stats.knownCount === 0}
                  onPress={handleSuggestRandom}
                />
                <StampButton
                  label="+ ADD"
                  variant="tertiary"
                  size="sm"
                  onPress={() => setAddModalOpen(true)}
                />
              </View>
            </CreamBlock>

            {/* Instant Jam Suggestion Callout */}
            {suggestedTune && (
              <Callout
                tone="song"
                title={`JAM CALL • ${suggestedTune.title.toUpperCase()} (KEY OF ${suggestedTune.defaultKey})`}
                body={`${suggestedTune.style}${
                  suggestedTune.composer ? ` • ${suggestedTune.composer}` : ''
                }${
                  suggestedTune.knownKeys.length > 1
                    ? ` • Known keys: ${suggestedTune.knownKeys.join(', ')}`
                    : ''
                }${suggestedTune.notes ? `\nNote: ${suggestedTune.notes}` : ''}`}
                actions={
                  <>
                    <StampButton
                      label="ANOTHER"
                      variant="primary"
                      size="sm"
                      onPress={handleSuggestRandom}
                    />
                    <StampButton
                      label="EDIT KEYS"
                      variant="tertiary"
                      size="sm"
                      onPress={() => setSelectedStandard(suggestedTune)}
                    />
                    <StampButton
                      label="CLOSE"
                      variant="tertiary"
                      size="sm"
                      onPress={() => setSuggestedTune(null)}
                    />
                  </>
                }
              />
            )}

            {/* Uncluttered Search, Key & Style Filter Card */}
            <CreamBlock style={styles.filterBlock}>
              <StampInput
                placeholder={
                  tab === 'KNOWN'
                    ? 'Search your known standards...'
                    : 'Search the 1,500 standards catalog to check off...'
                }
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Key Filter Strip */}
              <View style={styles.filterSection}>
                <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
                  KEY
                </Text>
                <View style={styles.pillWrap}>
                  {(['ALL', ...CIRCLE_OF_FIFTHS] as ('ALL' | PitchKey)[]).map((k) => {
                    const active = keyFilter === k;
                    return (
                      <Pressable
                        key={k}
                        accessibilityRole="button"
                        accessibilityLabel={`Key filter ${k}`}
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setKeyFilter(active && k !== 'ALL' ? 'ALL' : k);
                        }}
                        style={[
                          styles.keyChip,
                          {
                            borderColor: colors.inkBlack,
                            backgroundColor: active
                              ? colors.primary
                              : colors.recessedSurface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.monoBold,
                            styles.keyChipText,
                            { color: active ? colors.onAccent : colors.inkBlack },
                          ]}
                        >
                          {k}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Style Filter Strip */}
              <View style={styles.filterSection}>
                <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
                  STYLE
                </Text>
                <SegmentedStamp<'ALL' | StandardStyle>
                  accessibilityLabel="Filter by style"
                  options={[
                    { id: 'ALL', label: 'ALL' },
                    ...STANDARD_STYLES.map((s) => ({ id: s, label: s })),
                  ]}
                  value={styleFilter}
                  onChange={(next) =>
                    setStyleFilter(next === styleFilter && next !== 'ALL' ? 'ALL' : next)
                  }
                  tone="brass"
                />
              </View>

              <View style={[styles.listHeaderMeta, { borderTopColor: colors.recessedSurface }]}>
                <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
                  {tab === 'KNOWN'
                    ? `SHOWING ${filteredList.length} KNOWN ${
                        filteredList.length === 1 ? 'STANDARD' : 'STANDARDS'
                      }`
                    : `SHOWING ${filteredList.length} CATALOG ${
                        filteredList.length === 1 ? 'STANDARD' : 'STANDARDS'
                      } — TAP BOX TO MARK KNOWN`}
                </Text>
                {(styleFilter !== 'ALL' || keyFilter !== 'ALL' || searchQuery.length > 0) && (
                  <Pressable
                    onPress={() => {
                      setStyleFilter('ALL');
                      setKeyFilter('ALL');
                      setSearchQuery('');
                    }}
                  >
                    <Text style={[typography.stampSmall, { color: colors.primary }]}>
                      CLEAR FILTERS
                    </Text>
                  </Pressable>
                )}
              </View>
            </CreamBlock>
          </View>
        }
        ListEmptyComponent={
          <CreamBlock>
            <Text style={[typography.heading, { color: colors.inkBlack }]}>
              {tab === 'KNOWN' && stats.knownCount === 0
                ? 'No standards marked as known yet.'
                : 'No matching standards.'}
            </Text>
            <Text style={[typography.mono, styles.emptySub, { color: colors.inkMuted }]}>
              {tab === 'KNOWN' && stats.knownCount === 0
                ? 'Switch to 1,500 CATALOG to check off tunes you already know, or add one directly.'
                : searchQuery.trim()
                ? `"${searchQuery.trim()}" isn't in the local list yet. Add it to your repertoire in one tap.`
                : 'Try clearing the active Key or Style filter.'}
            </Text>
            <View style={styles.emptyActions}>
              {tab === 'KNOWN' && stats.knownCount === 0 && (
                <StampButton
                  label="BROWSE 1,500 CATALOG"
                  variant="primary"
                  size="sm"
                  onPress={() => setTab('CATALOG')}
                />
              )}
              {searchQuery.trim().length > 0 && (
                <StampButton
                  label={`+ ADD "${searchQuery.trim().toUpperCase()}"`}
                  variant="primary"
                  size="sm"
                  onPress={() => setAddModalOpen(true)}
                />
              )}
            </View>
          </CreamBlock>
        }
      />

      <StandardDetailModal
        standard={selectedStandard}
        visible={Boolean(selectedStandard)}
        onClose={() => setSelectedStandard(null)}
        onToggleKnown={handleToggleKnown}
        onUpdateKeys={(id, keys, defKey) => {
          updateStandardMasteredKeys(id, keys, defKey);
          refresh();
        }}
        onUpdateNotesAndStyle={(id, notes, style) => {
          updateStandardPersonalNotes(id, notes, style);
          refresh();
        }}
        onSetAsActiveStandard={handleSetAsActiveStandard}
        isActiveStandard={
          selectedStandard
            ? normalizeStandardTitle(selectedStandard.title) === activeSongNorm
            : false
        }
      />

      <AddStandardModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        initialTitle={searchQuery.trim()}
        onAdd={(input) => {
          addCustomPokedexStandard(input);
          setSearchQuery('');
          refresh();
        }}
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
    paddingBottom: 36,
  },
  meterTrack: {
    height: 8,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
  },
  topActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  filterBlock: {
    gap: 10,
  },
  filterSection: {
    gap: 4,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  keyChip: {
    minWidth: 32,
    height: 30,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyChipText: {
    fontSize: 12,
  },
  listHeaderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    paddingTop: 8,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  checkHitbox: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 13,
    lineHeight: 15,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tuneTitle: {
    fontSize: 16,
    lineHeight: 20,
    flexShrink: 1,
  },
  subMeta: {
    fontSize: 11,
  },
  keyColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  extraKeys: {
    fontSize: 10,
  },
  emptySub: {
    marginTop: 4,
    lineHeight: 18,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
});
