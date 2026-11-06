/**
 * NoteEditorModal — Obsidian-Style Markdown Note Editor
 *
 * Full-featured markdown authoring studio with:
 * - Real-time Live Preview vs Raw Markdown toggle
 * - Vintage quick formatting toolbar (WikiLinks, tags, chord charts, callouts)
 * - YAML frontmatter auto-sync
 * - Category & Tag stamps
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { KnowledgeNote, KnowledgeCategory } from '../../types/knowledge';
import { VintageMarkdown } from './VintageMarkdown';
import { WikiLinkPickerModal } from './WikiLinkPickerModal';
import { StampButton } from '../StampButton';
import { StampModal } from '../StampModal';
import { SegmentedStamp } from '../SegmentedStamp';

interface NoteEditorModalProps {
  visible: boolean;
  noteToEdit: KnowledgeNote | null;
  allNotes: KnowledgeNote[];
  onSave: (note: Partial<KnowledgeNote> & { title: string; content: string }) => void;
  onClose: () => void;
}

const CATEGORIES: KnowledgeCategory[] = [
  'HARMONY',
  'SOLOING',
  'COMPING',
  'THEORY',
  'ROUTINE',
  'STANDARDS',
];

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  visible,
  noteToEdit,
  allNotes,
  onSave,
  onClose,
}) => {
  const { colors, typography } = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('THEORY');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setCategory(noteToEdit.category);
      setTags(noteToEdit.tags || []);
      setTagsInput('');
    } else {
      setTitle('');
      setContent(
        '# New Note Title\n\nWrite your jazz observations, chord analysis, or repertoire notes here...\n\n> [!NOTE]\n> Link other concepts using `[[Concept Name]]` or tags `#harmony`.\n'
      );
      setCategory('HARMONY');
      setTags(['practice']);
      setTagsInput('');
    }
    setActiveTab('edit');
  }, [noteToEdit, visible]);

  const handleAddTag = () => {
    const clean = tagsInput.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagsInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleInsertText = (snippet: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setContent((prev) => prev + snippet);
  };

  const handleInsertWikiLink = (targetTitle: string) => {
    handleInsertText(`[[${targetTitle}]]`);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this knowledge note.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      id: noteToEdit?.id,
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      pinned: noteToEdit?.pinned,
      createdAt: noteToEdit?.createdAt,
    });
    onClose();
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <StampModal
      visible={visible}
      title={noteToEdit ? 'EDIT KNOWLEDGE NOTE' : 'NEW OBSIDIAN NOTE'}
      subtitle={noteToEdit ? `Editing "${noteToEdit.title}"` : 'Create a markdown document with [[WikiLinks]]'}
      onClose={onClose}
      actions={
        <>
          <StampButton label="DISCARD" variant="tertiary" size="sm" onPress={onClose} />
          <StampButton label="SAVE NOTE ✓" variant="primary" size="sm" onPress={handleSave} />
        </>
      }
    >
      <View style={styles.container}>
        {/* Title Input */}
        <View style={styles.fieldBlock}>
          <Text style={[typography.stamp, { color: colors.inkBlack }]}>NOTE TITLE:</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Barry Harris Half-Step Rules"
            placeholderTextColor={colors.inkMuted}
            style={[
              typography.monoBold,
              styles.titleInput,
              {
                borderColor: colors.inkBlack,
                backgroundColor: colors.cardSurface,
                color: colors.inkBlack,
              },
            ]}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.fieldBlock}>
          <Text style={[typography.stamp, { color: colors.inkBlack }]}>CATEGORY:</Text>
          <SegmentedStamp<KnowledgeCategory>
            options={CATEGORIES.map((c) => ({ id: c, label: c }))}
            value={category}
            onChange={(val) => setCategory(val)}
          />
        </View>

        {/* Tags Row */}
        <View style={styles.fieldBlock}>
          <Text style={[typography.stamp, { color: colors.inkBlack }]}>TAGS:</Text>
          <View style={styles.tagsContainer}>
            <View style={styles.tagsList}>
              {tags.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => handleRemoveTag(t)}
                  style={[
                    styles.tagPill,
                    { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                  ]}
                >
                  <Text style={[typography.stampSmall, { color: colors.tertiary }]}>
                    #{t.toUpperCase()} ✕
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.tagInputRow}>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="Add tag..."
                placeholderTextColor={colors.inkMuted}
                onSubmitEditing={handleAddTag}
                style={[
                  typography.mono,
                  styles.tagInput,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: colors.cardSurface,
                    color: colors.inkBlack,
                  },
                ]}
              />
              <Pressable
                onPress={handleAddTag}
                style={[
                  styles.addTagBtn,
                  { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
                ]}
              >
                <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>+ ADD</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Tab Selector: Edit vs Preview */}
        <View style={[styles.modeBar, { borderColor: colors.inkBlack }]}>
          <Pressable
            onPress={() => setActiveTab('edit')}
            style={[
              styles.modeTab,
              {
                backgroundColor: activeTab === 'edit' ? colors.primary : colors.recessedSurface,
                borderRightWidth: 1.5,
                borderRightColor: colors.inkBlack,
              },
            ]}
          >
            <Text
              style={[
                typography.stamp,
                { color: activeTab === 'edit' ? colors.onAccent : colors.inkBlack },
              ]}
            >
              ✎ EDIT RAW MD
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('preview')}
            style={[
              styles.modeTab,
              {
                backgroundColor: activeTab === 'preview' ? colors.primary : colors.recessedSurface,
              },
            ]}
          >
            <Text
              style={[
                typography.stamp,
                { color: activeTab === 'preview' ? colors.onAccent : colors.inkBlack },
              ]}
            >
              👁 LIVE PREVIEW
            </Text>
          </Pressable>
        </View>

        {/* Quick Markdown Toolbar (Only visible in edit mode) */}
        {activeTab === 'edit' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toolbarScroll}
            contentContainerStyle={styles.toolbarContent}
          >
            <Pressable
              onPress={() => setShowLinkPicker(true)}
              style={[
                styles.toolBtn,
                { borderColor: colors.primary, backgroundColor: colors.cardSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.primary }]}>
                ☍ [[LINK]]
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('\n\n```chord\n| Dm7 | G7 | Cmaj7 | % |\n```\n')}
              style={[
                styles.toolBtn,
                { borderColor: colors.tertiary, backgroundColor: colors.cardSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.tertiary }]}>
                ♫ CHORD CHART
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('\n\n> [!TIP] Pro Tip\n> ')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                &gt; [!TIP]
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('\n\n## Section Header\n')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                ## H2
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('**bold**')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                **B**
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('*italic*')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                *I*
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('\n- [ ] ')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                - [ ] TASK
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleInsertText('\n\n---\n')}
              style={[
                styles.toolBtn,
                { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface },
              ]}
            >
              <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
                --- RULE
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Main Content Area */}
        {activeTab === 'edit' ? (
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write in Obsidian Markdown..."
            placeholderTextColor={colors.inkMuted}
            multiline
            autoCapitalize="sentences"
            style={[
              typography.mono,
              styles.editorInput,
              {
                borderColor: colors.inkBlack,
                backgroundColor: colors.cardSurface,
                color: colors.inkBlack,
              },
            ]}
          />
        ) : (
          <ScrollView
            style={[
              styles.previewContainer,
              { borderColor: colors.inkBlack, backgroundColor: colors.cardSurface },
            ]}
          >
            <VintageMarkdown content={content} />
          </ScrollView>
        )}

        {/* Footer Metrics */}
        <View style={styles.footerRow}>
          <Text style={[typography.mono, styles.metaText, { color: colors.inkMuted }]}>
            {wordCount} WORDS • {content.length} CHARS
          </Text>
          <Text style={[typography.stampSmall, { color: colors.primary }]}>
            MARKDOWN READY
          </Text>
        </View>

        {/* WikiLink Picker Modal */}
        <WikiLinkPickerModal
          visible={showLinkPicker}
          notes={allNotes}
          currentNoteId={noteToEdit?.id}
          onSelect={handleInsertWikiLink}
          onClose={() => setShowLinkPicker(false)}
        />
      </View>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    maxHeight: 520,
  },
  fieldBlock: {
    gap: 4,
  },
  titleInput: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  tagsContainer: {
    gap: 6,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    height: 32,
  },
  addTagBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  modeBar: {
    flexDirection: 'row',
    borderWidth: 1.5,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarScroll: {
    maxHeight: 34,
  },
  toolbarContent: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorInput: {
    borderWidth: 1.5,
    padding: 10,
    height: 220,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 18,
  },
  previewContainer: {
    borderWidth: 1.5,
    padding: 12,
    height: 220,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  metaText: {
    fontSize: 11,
  },
});
