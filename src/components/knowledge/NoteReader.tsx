/**
 * NoteReader — Obsidian-Style Note Detail & Reading View
 *
 * Displays full rendered markdown along with:
 * - Bidirectional Backlinks ("Mentioned In")
 * - Connected Outgoing WikiLinks
 * - Related Shed Engine practice exercises
 * - Quick Action Buttons (Edit, Pin, Copy Markdown, Delete)
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { KnowledgeNote } from '../../types/knowledge';
import {
  getBacklinks,
  getOutgoingLinks,
  exportNoteAsMarkdown,
} from '../../db/knowledgeRepository';
import { VintageMarkdown } from './VintageMarkdown';
import { StampBadge } from '../StampBadge';
import { StampButton } from '../StampButton';
import { CreamBlock } from '../CreamBlock';
import { Exercise } from '../../types/models';

interface NoteReaderProps {
  note: KnowledgeNote;
  allNotes: KnowledgeNote[];
  exercises?: Exercise[];
  onBack: () => void;
  onEdit: (note: KnowledgeNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onNavigateToNote: (noteTitleOrId: string) => void;
  onStartExercise?: (exerciseId: string) => void;
}

export const NoteReader: React.FC<NoteReaderProps> = ({
  note,
  allNotes,
  exercises = [],
  onBack,
  onEdit,
  onDelete,
  onTogglePin,
  onNavigateToNote,
  onStartExercise,
}) => {
  const { colors, typography } = useTheme();

  const backlinks = getBacklinks(note.title, allNotes);
  const outgoingLinks = getOutgoingLinks(note.content, allNotes);

  // Find related exercises
  const relatedExercises = exercises.filter((ex) => {
    if (note.relatedExerciseIds?.includes(ex.id)) return true;
    const normNoteTitle = note.title.toLowerCase();
    const normExTitle = ex.title.toLowerCase();
    return (
      normExTitle.includes(normNoteTitle) ||
      normNoteTitle.includes(normExTitle) ||
      note.tags.some((t) => normExTitle.includes(t))
    );
  });

  const handleCopyMarkdown = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const md = exportNoteAsMarkdown(note);
    Alert.alert('Markdown Preview', md);
  };

  const handleDeletePrompt = () => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}" from your knowledge vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(note.id);
          },
        },
      ]
    );
  };

  const handleWikiLinkPress = (targetTitle: string) => {
    onNavigateToNote(targetTitle);
  };

  const formattedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.scrollRoot} contentContainerStyle={styles.content}>
      {/* Top Navigation & Action Header */}
      <View style={[styles.navHeader, { borderBottomColor: colors.inkBlack }]}>
        <Pressable
          onPress={onBack}
          style={[
            styles.backBtn,
            { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
          ]}
        >
          <Text style={[typography.stamp, { color: colors.inkBlack }]}>◀ VAULT</Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => onTogglePin(note.id)}
            style={[
              styles.actionIconBtn,
              {
                borderColor: colors.inkBlack,
                backgroundColor: note.pinned ? colors.tertiary : colors.recessedSurface,
              },
            ]}
          >
            <Text
              style={[
                typography.stampSmall,
                { color: note.pinned ? colors.onAccent : colors.inkBlack },
              ]}
            >
              {note.pinned ? '★ PINNED' : '☆ PIN'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCopyMarkdown}
            style={[
              styles.actionIconBtn,
              { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
            ]}
          >
            <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>📋 MD</Text>
          </Pressable>

          <Pressable
            onPress={() => onEdit(note)}
            style={[
              styles.actionIconBtn,
              { borderColor: colors.inkBlack, backgroundColor: colors.primary },
            ]}
          >
            <Text style={[typography.stampSmall, { color: colors.onAccent }]}>✎ EDIT</Text>
          </Pressable>

          <Pressable
            onPress={handleDeletePrompt}
            style={[
              styles.actionIconBtn,
              { borderColor: colors.secondary, backgroundColor: colors.cardSurface },
            ]}
          >
            <Text style={[typography.stampSmall, { color: colors.secondary }]}>✕ DEL</Text>
          </Pressable>
        </View>
      </View>

      {/* Main Note Card */}
      <CreamBlock>
        <View style={styles.metaTopRow}>
          <StampBadge label={note.category} type={note.category as any} />
          <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
            UPDATED {formattedDate}
          </Text>
        </View>

        {/* Tags */}
        {note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tagBadge,
                  { borderColor: colors.inkMuted, backgroundColor: colors.recessedSurface },
                ]}
              >
                <Text style={[typography.stampSmall, { color: colors.tertiary }]}>
                  #{tag.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rendered Markdown Content */}
        <View style={styles.markdownWrapper}>
          <VintageMarkdown
            content={note.content}
            onPressWikiLink={handleWikiLinkPress}
          />
        </View>

        {/* Outgoing Links */}
        {outgoingLinks.length > 0 && (
          <View style={[styles.sectionDividerBlock, { borderTopColor: colors.inkBlack }]}>
            <Text style={[typography.stamp, styles.sectionTitle, { color: colors.inkBlack }]}>
              CONNECTED NOTES IN THIS NOTE ({outgoingLinks.length}):
            </Text>
            <View style={styles.linkChipsWrap}>
              {outgoingLinks.map((link) => (
                <Pressable
                  key={link.targetTitle}
                  onPress={() => onNavigateToNote(link.targetTitle)}
                  style={[
                    styles.linkChip,
                    {
                      borderColor: link.exists ? colors.primary : colors.inkMuted,
                      backgroundColor: link.exists ? colors.recessedSurface : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.monoBold,
                      styles.linkChipText,
                      { color: link.exists ? colors.primary : colors.inkMuted },
                    ]}
                  >
                    {link.exists ? '☍' : '+'} [[{link.displayText}]]
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Backlinks / Mentioned In */}
        <View style={[styles.sectionDividerBlock, { borderTopColor: colors.inkBlack }]}>
          <Text style={[typography.stamp, styles.sectionTitle, { color: colors.inkBlack }]}>
            MENTIONED IN / BACKLINKS ({backlinks.length}):
          </Text>
          {backlinks.length === 0 ? (
            <Text style={[typography.mono, styles.emptyText, { color: colors.inkMuted }]}>
              No other notes link to this note yet. Use `[[{note.title}]]` in another note to create a connection.
            </Text>
          ) : (
            <View style={styles.backlinksList}>
              {backlinks.map((bl) => (
                <Pressable
                  key={bl.sourceNoteId}
                  onPress={() => onNavigateToNote(bl.sourceNoteTitle)}
                  style={[
                    styles.backlinkCard,
                    { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                  ]}
                >
                  <View style={styles.backlinkHeader}>
                    <Text
                      style={[
                        typography.heading,
                        styles.backlinkTitle,
                        { color: colors.inkBlack },
                      ]}
                    >
                      ☍ {bl.sourceNoteTitle}
                    </Text>
                    <StampBadge label={bl.sourceCategory} type={bl.sourceCategory as any} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      typography.mono,
                      styles.backlinkSnippet,
                      { color: colors.inkMuted },
                    ]}
                  >
                    “...{bl.contextSnippet}...”
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Related Shed Engine Exercises */}
        {relatedExercises.length > 0 && onStartExercise && (
          <View style={[styles.sectionDividerBlock, { borderTopColor: colors.inkBlack }]}>
            <Text style={[typography.stamp, styles.sectionTitle, { color: colors.primary }]}>
              RELATED PRACTICE DRILLS IN LIBRARY:
            </Text>
            {relatedExercises.map((ex) => (
              <View
                key={ex.id}
                style={[
                  styles.exerciseCard,
                  { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                ]}
              >
                <View style={styles.exInfo}>
                  <Text style={[typography.heading, styles.exTitle, { color: colors.inkBlack }]}>
                    {ex.title}
                  </Text>
                  <Text style={[typography.mono, styles.exMeta, { color: colors.inkMuted }]}>
                    {ex.durationMinutes} MIN • ♩{ex.currentBpm} • {ex.context}
                  </Text>
                </View>
                <StampButton
                  label="PRACTICE ▶"
                  variant="primary"
                  size="sm"
                  onPress={() => onStartExercise(ex.id)}
                />
              </View>
            ))}
          </View>
        )}
      </CreamBlock>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 2,
  },
  backBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  metaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  markdownWrapper: {
    marginBottom: 16,
  },
  sectionDividerBlock: {
    borderTopWidth: 2,
    paddingTop: 12,
    marginTop: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
  },
  linkChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  linkChip: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkChipText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  backlinksList: {
    gap: 8,
  },
  backlinkCard: {
    borderWidth: 1.5,
    padding: 10,
    gap: 4,
  },
  backlinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backlinkTitle: {
    fontSize: 14,
  },
  backlinkSnippet: {
    fontSize: 11,
    lineHeight: 16,
  },
  exerciseCard: {
    borderWidth: 1.5,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  exInfo: {
    flex: 1,
  },
  exTitle: {
    fontSize: 13,
  },
  exMeta: {
    fontSize: 10,
    marginTop: 2,
  },
});
