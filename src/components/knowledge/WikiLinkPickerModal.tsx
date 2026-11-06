/**
 * WikiLinkPickerModal — Quick note selector for inserting [[WikiLinks]]
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { KnowledgeNote } from '../../types/knowledge';
import { StampBadge } from '../StampBadge';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';

interface WikiLinkPickerModalProps {
  visible: boolean;
  notes: KnowledgeNote[];
  currentNoteId?: string;
  onSelect: (noteTitle: string) => void;
  onClose: () => void;
}

export const WikiLinkPickerModal: React.FC<WikiLinkPickerModalProps> = ({
  visible,
  notes,
  currentNoteId,
  onSelect,
  onClose,
}) => {
  const { colors, typography } = useTheme();
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter((n) => {
    if (currentNoteId && n.id === currentNoteId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handlePick = (title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(title);
    setSearch('');
    onClose();
  };

  return (
    <StampModal
      visible={visible}
      title="INSERT [[WIKILINK]]"
      subtitle="Select a knowledge note to cross-link or enter a new target:"
      onClose={onClose}
      actions={
        <StampButton label="CANCEL" variant="tertiary" size="sm" onPress={onClose} />
      }
    >
      <View style={styles.container}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search vault notes or type new link..."
          placeholderTextColor={colors.inkMuted}
          autoFocus
          style={[
            typography.mono,
            styles.input,
            {
              borderColor: colors.inkBlack,
              backgroundColor: colors.recessedSurface,
              color: colors.inkBlack,
            },
          ]}
        />

        {search.trim().length > 0 &&
          !notes.some(
            (n) => n.title.toLowerCase() === search.trim().toLowerCase()
          ) && (
            <Pressable
              onPress={() => handlePick(search.trim())}
              style={[
                styles.customLinkBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.cardSurface,
                },
              ]}
            >
              <Text style={[typography.stamp, { color: colors.primary }]}>
                + LINK TO NEW TARGET: "[[{search.trim()}]]"
              </Text>
            </Pressable>
          )}

        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredNotes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => handlePick(note.title)}
              style={({ pressed }) => [
                styles.noteRow,
                {
                  borderColor: colors.inkBlack,
                  backgroundColor: pressed ? colors.recessedSurface : colors.cardSurface,
                },
              ]}
            >
              <View style={styles.noteInfo}>
                <Text style={[typography.heading, styles.noteTitle, { color: colors.inkBlack }]}>
                  {note.title}
                </Text>
                <View style={styles.badgesRow}>
                  <StampBadge label={note.category} type={note.category as any} />
                  {note.tags.slice(0, 2).map((tag) => (
                    <Text
                      key={tag}
                      style={[typography.stampSmall, { color: colors.inkMuted }]}
                    >
                      #{tag}
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={[typography.stamp, { color: colors.primary }]}>
                [[LINK]]
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </StampModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    maxHeight: 380,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  customLinkBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 10,
    alignItems: 'center',
  },
  listScroll: {
    maxHeight: 280,
  },
  noteRow: {
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteInfo: {
    flex: 1,
    gap: 4,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
