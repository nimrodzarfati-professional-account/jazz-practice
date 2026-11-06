/**
 * KnowledgeScreen — Obsidian-Style Jazz Knowledge Base & Codex
 *
 * Provides:
 * - Markdown note management with Obsidian conventions
 * - Interactive Graph View of note interconnections
 * - Bidirectional WikiLink navigation & history stack
 * - Full-text search and tag filtering
 * - Direct integration with Shed Engine practice exercises
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useSession } from '../session/SessionContext';
import { KnowledgeNote, KnowledgeCategory } from '../types/knowledge';
import {
  getKnowledgeNotes,
  saveKnowledgeNote,
  deleteKnowledgeNote,
  togglePinNote,
  getNoteById,
  getNoteByTitleOrSlug,
  getOutgoingLinks,
  getBacklinks,
} from '../db/knowledgeRepository';
import { extractFrontmatter } from '../services/markdownParser';
import { SectionHeader } from '../components/SectionHeader';
import { StampBadge } from '../components/StampBadge';
import { StampButton } from '../components/StampButton';
import { CreamBlock } from '../components/CreamBlock';
import { SegmentedStamp } from '../components/SegmentedStamp';
import { GraphView } from '../components/knowledge/GraphView';
import { NoteReader } from '../components/knowledge/NoteReader';
import { NoteEditorModal } from '../components/knowledge/NoteEditorModal';
import { ImportMarkdownModal } from '../components/knowledge/ImportMarkdownModal';
import { subscribeToRealtimeChanges } from '../services/CloudSyncService';

interface KnowledgeScreenProps {
  onStartExercise?: (exerciseId: string) => void;
}

export const KnowledgeScreen: React.FC<KnowledgeScreenProps> = ({ onStartExercise }) => {
  const { colors, typography } = useTheme();
  const { isDesktop } = useResponsiveLayout();
  const { exercises } = useSession();

  const [notes, setNotes] = useState<KnowledgeNote[]>(() => {
    try {
      return getKnowledgeNotes();
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // Navigation Stack for Obsidian WikiLink traversal
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<string[]>([]);

  // Modals
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<KnowledgeNote | null>(null);
  const [isImportVisible, setIsImportVisible] = useState(false);

  // Reload notes from database
  const reloadNotes = () => {
    try {
      const list = getKnowledgeNotes();
      setNotes(list);
    } catch (e) {
      console.warn('[KnowledgeScreen] Error reloading notes:', e);
    }
  };

  useEffect(() => {
    reloadNotes();
    const unsubscribe = subscribeToRealtimeChanges(() => {
      reloadNotes();
    });
    return () => unsubscribe();
  }, []);

  // Compute all unique tags across notes with counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes || []) {
      const tags = Array.isArray(n?.tags) ? n.tags : [];
      for (const t of tags) {
        if (t) counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // Compute total wikilinks across vault
  const totalWikiLinks = useMemo(() => {
    let count = 0;
    for (const n of notes || []) {
      count += getOutgoingLinks(n?.content || '', notes || []).length;
    }
    return count;
  }, [notes]);

  // Filtered notes for list view
  const filteredNotes = useMemo(() => {
    return (notes || []).filter((n) => {
      if (!n) return false;
      const cat = n.category || 'THEORY';
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const title = n.title || '';
      const content = n.content || '';

      // Category filter
      if (selectedCategory !== 'ALL' && cat !== selectedCategory) {
        return false;
      }
      // Tag filter
      if (selectedTag && !tags.includes(selectedTag)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = title.toLowerCase().includes(q);
        const matchesContent = content.toLowerCase().includes(q);
        const matchesTags = tags.some((t) => (t || '').toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedCategory, selectedTag, searchQuery]);

  // Open a note in reading mode
  const handleOpenNote = (noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentNoteId && currentNoteId !== noteId) {
      setNavHistory((prev) => [...prev, currentNoteId]);
    } else {
      setNavHistory([]);
    }
    setCurrentNoteId(noteId);
  };

  // Traverse a WikiLink: [[Target]]
  const handleNavigateWikiLink = (targetTitle: string) => {
    const target = getNoteByTitleOrSlug(targetTitle);
    if (target) {
      handleOpenNote(target.id);
    } else {
      // Note doesn't exist yet: offer to create it!
      Alert.alert(
        'Note Not Found',
        `No note titled "${targetTitle}" exists yet. Would you like to create it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Note',
            onPress: () => {
              setNoteToEdit({
                id: '',
                title: targetTitle,
                slug: '',
                content: `# ${targetTitle}\n\nObservational notes and analysis...\n`,
                category: 'THEORY',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setIsEditorVisible(true);
            },
          },
        ]
      );
    }
  };

  // Back button in NoteReader
  const handleBackFromReader = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (navHistory.length > 0) {
      const prevId = navHistory[navHistory.length - 1];
      setNavHistory((prev) => prev.slice(0, -1));
      setCurrentNoteId(prevId);
    } else {
      setCurrentNoteId(null);
    }
  };

  // Save note from editor
  const handleSaveNote = (
    noteInput: Partial<KnowledgeNote> & { title: string; content: string }
  ) => {
    const saved = saveKnowledgeNote(noteInput);
    reloadNotes();
    if (currentNoteId === saved.id || !currentNoteId) {
      setCurrentNoteId(saved.id);
    }
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    deleteKnowledgeNote(noteId);
    reloadNotes();
    if (currentNoteId === noteId) {
      setCurrentNoteId(null);
      setNavHistory([]);
    }
  };

  // Toggle pin
  const handleTogglePin = (noteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePinNote(noteId);
    reloadNotes();
  };

  // Clean snippet for preview card
  const getNoteSnippet = (content: string) => {
    const { body } = extractFrontmatter(content || '');
    const lines = (body || '')
      .split('\n')
      .map((l) => (l || '').trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('```'));
    return lines.slice(0, 2).join(' ').replace(/[>*_`]/g, '');
  };

  const currentNote = currentNoteId ? getNoteById(currentNoteId) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.canvasBg }]}>
      {/* If viewing a single note in Reading Mode */}
      {currentNote ? (
        <NoteReader
          note={currentNote}
          allNotes={notes}
          exercises={exercises}
          onBack={handleBackFromReader}
          onEdit={(n) => {
            setNoteToEdit(n);
            setIsEditorVisible(true);
          }}
          onDelete={handleDeleteNote}
          onTogglePin={handleTogglePin}
          onNavigateToNote={handleNavigateWikiLink}
          onStartExercise={onStartExercise}
        />
      ) : (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[styles.contentContainer, isDesktop && styles.desktopContainer]}
        >
          {/* Screen Title & Top Actions */}
          <View style={styles.topHeader}>
            <SectionHeader
              title="KNOWLEDGE CODEX"
              meta="OBSIDIAN MD SYSTEM"
              size="title"
            />
            <View style={styles.topActionsRow}>
              <StampButton
                label="+ NEW NOTE"
                variant="primary"
                size="sm"
                onPress={() => {
                  setNoteToEdit(null);
                  setIsEditorVisible(true);
                }}
              />
              <StampButton
                label="IMPORT .MD"
                variant="tertiary"
                size="sm"
                onPress={() => setIsImportVisible(true)}
              />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setViewMode((m) => (m === 'list' ? 'graph' : 'list'));
                }}
                style={[
                  styles.viewModeToggle,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: viewMode === 'graph' ? colors.primary : colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.stampSmall,
                    { color: viewMode === 'graph' ? colors.onAccent : colors.inkBlack },
                  ]}
                >
                  {viewMode === 'graph' ? '≡ LIST VIEW' : '☍ GRAPH VIEW'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Vault Stats Ribbon */}
          <View
            style={[
              styles.statsRibbon,
              { backgroundColor: colors.recessedSurface, borderColor: colors.inkBlack },
            ]}
          >
            <Text style={[typography.stamp, { color: colors.inkBlack }]}>
              {notes.length} NOTES • {tagCounts.length} TAGS • {totalWikiLinks} WIKILINKS
            </Text>
            <Text style={[typography.stampSmall, { color: colors.primary }]}>
              OBSIDIAN COMPATIBLE
            </Text>
          </View>

          {/* Graph View */}
          {viewMode === 'graph' ? (
            <View style={styles.graphWrapper}>
              <GraphView notes={notes} onSelectNote={handleOpenNote} />
            </View>
          ) : (
            <>
              {/* Search Bar */}
              <View style={styles.searchBlock}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search markdown notes, titles, or concepts..."
                  placeholderTextColor={colors.inkMuted}
                  style={[
                    typography.mono,
                    styles.searchInput,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: colors.cardSurface,
                      color: colors.inkBlack,
                    },
                  ]}
                />
                {searchQuery ? (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchBtn}
                  >
                    <Text style={[typography.stamp, { color: colors.inkMuted }]}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Category Segmented Filter */}
              <View style={styles.categoryFilterBlock}>
                <SegmentedStamp<KnowledgeCategory | 'ALL'>
                  options={[
                    { id: 'ALL', label: 'ALL' },
                    { id: 'HARMONY', label: 'HARMONY' },
                    { id: 'SOLOING', label: 'SOLOING' },
                    { id: 'COMPING', label: 'COMPING' },
                    { id: 'THEORY', label: 'THEORY' },
                    { id: 'ROUTINE', label: 'ROUTINE' },
                  ]}
                  value={selectedCategory}
                  onChange={(cat) => setSelectedCategory(cat)}
                  size="sm"
                />
              </View>

              {/* Tag Filters Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsFilterScroll}
                contentContainerStyle={styles.tagsFilterContent}
              >
                <Pressable
                  onPress={() => setSelectedTag(null)}
                  style={[
                    styles.tagFilterChip,
                    {
                      borderColor: colors.inkBlack,
                      backgroundColor: selectedTag === null ? colors.primary : colors.recessedSurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.stampSmall,
                      { color: selectedTag === null ? colors.onAccent : colors.inkBlack },
                    ]}
                  >
                    ALL TAGS ({notes.length})
                  </Text>
                </Pressable>

                {tagCounts.map(([tag, count]) => (
                  <Pressable
                    key={tag}
                    onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    style={[
                      styles.tagFilterChip,
                      {
                        borderColor: colors.inkBlack,
                        backgroundColor: selectedTag === tag ? colors.primary : colors.recessedSurface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.stampSmall,
                        { color: selectedTag === tag ? colors.onAccent : colors.tertiary },
                      ]}
                    >
                      #{tag.toUpperCase()} ({count})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Notes List */}
              <View style={styles.notesList}>
                {filteredNotes.length === 0 ? (
                  <CreamBlock>
                    <Text style={[typography.heading, { color: colors.inkBlack, marginBottom: 6 }]}>
                      No Matching Notes Found
                    </Text>
                    <Text style={[typography.mono, { color: colors.inkMuted, marginBottom: 12 }]}>
                      {searchQuery
                        ? `No notes matched "${searchQuery}".`
                        : 'Your vault is currently empty.'}
                    </Text>
                    <StampButton
                      label="+ CREATE THIS NOTE"
                      variant="primary"
                      size="sm"
                      onPress={() => {
                        setNoteToEdit({
                          id: '',
                          title: searchQuery || 'New Note',
                          slug: '',
                          content: `# ${searchQuery || 'New Note'}\n\nObservational notes...\n`,
                          category: 'THEORY',
                          tags: selectedTag ? [selectedTag] : [],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        });
                        setIsEditorVisible(true);
                      }}
                    />
                  </CreamBlock>
                ) : (
                  filteredNotes.map((note) => {
                    const snippet = getNoteSnippet(note.content || '');
                    const outgoing = getOutgoingLinks(note.content || '', notes || []);
                    const incoming = getBacklinks(note.title || '', notes || []);
                    const noteTags = Array.isArray(note.tags) ? note.tags : [];

                    return (
                      <Pressable
                        key={note.id}
                        onPress={() => handleOpenNote(note.id)}
                      >
                        <CreamBlock>
                          <View style={styles.noteCardTop}>
                            <View style={styles.badgesWrap}>
                              <StampBadge label={note.category || 'THEORY'} type={(note.category || 'THEORY') as any} />
                              {note.pinned && (
                                <StampBadge label="★ PINNED" tone="brass" />
                              )}
                            </View>
                            <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
                              {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}
                            </Text>
                          </View>

                          <Text
                            style={[
                              typography.title,
                              styles.noteCardTitle,
                              { color: colors.inkBlack },
                            ]}
                          >
                            {note.title || 'Untitled Note'}
                          </Text>

                          {snippet ? (
                            <Text
                              numberOfLines={2}
                              style={[
                                typography.mono,
                                styles.noteSnippet,
                                { color: colors.inkMuted },
                              ]}
                            >
                              {snippet}
                            </Text>
                          ) : null}

                          <View style={styles.noteCardFooter}>
                            <View style={styles.tagsPreviewRow}>
                              {noteTags.slice(0, 3).map((tag) => (
                                <Text
                                  key={tag}
                                  style={[
                                    typography.stampSmall,
                                    { color: colors.tertiary, marginRight: 6 },
                                  ]}
                                >
                                  #{tag}
                                </Text>
                              ))}
                            </View>

                            <View style={styles.linkCounters}>
                              <Text style={[typography.monoBold, styles.linkCounterText, { color: colors.primary }]}>
                                ☍ {outgoing.length}
                              </Text>
                              <Text style={[typography.monoBold, styles.linkCounterText, { color: colors.olive }]}>
                                ↩ {incoming.length}
                              </Text>
                            </View>
                          </View>
                        </CreamBlock>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Editor Modal */}
      <NoteEditorModal
        visible={isEditorVisible}
        noteToEdit={noteToEdit}
        allNotes={notes}
        onSave={handleSaveNote}
        onClose={() => setIsEditorVisible(false)}
      />

      {/* Import Modal */}
      <ImportMarkdownModal
        visible={isImportVisible}
        onImportSuccess={(imported) => {
          reloadNotes();
          handleOpenNote(imported.id);
        }}
        onClose={() => setIsImportVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  desktopContainer: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  topHeader: {
    gap: 10,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewModeToggle: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRibbon: {
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graphWrapper: {
    height: 520,
    borderWidth: 2,
    borderColor: '#181512',
    overflow: 'hidden',
  },
  searchBlock: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  categoryFilterBlock: {
    marginVertical: 2,
  },
  tagsFilterScroll: {
    maxHeight: 36,
  },
  tagsFilterContent: {
    flexDirection: 'row',
    gap: 6,
  },
  tagFilterChip: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    gap: 2,
  },
  noteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgesWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  noteCardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  noteSnippet: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  noteCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2D7C3',
    paddingTop: 6,
  },
  tagsPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkCounters: {
    flexDirection: 'row',
    gap: 8,
  },
  linkCounterText: {
    fontSize: 11,
  },
});
