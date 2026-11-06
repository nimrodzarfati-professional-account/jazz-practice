/**
 * ImportMarkdownModal — Import raw .md markdown files/text into the vault
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { importNoteFromMarkdown } from '../../db/knowledgeRepository';
import { KnowledgeNote } from '../../types/knowledge';
import { StampModal } from '../StampModal';
import { StampButton } from '../StampButton';

interface ImportMarkdownModalProps {
  visible: boolean;
  onImportSuccess: (importedNote: KnowledgeNote) => void;
  onClose: () => void;
}

export const ImportMarkdownModal: React.FC<ImportMarkdownModalProps> = ({
  visible,
  onImportSuccess,
  onClose,
}) => {
  const { colors, typography } = useTheme();
  const [rawText, setRawText] = useState('');

  const handleImport = () => {
    if (!rawText.trim()) {
      Alert.alert('Empty Markdown', 'Please paste the contents of your .md file.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const note = importNoteFromMarkdown(rawText.trim());
      setRawText('');
      onImportSuccess(note);
      onClose();
    } catch {
      Alert.alert('Import Failed', 'Unable to parse markdown file format.');
    }
  };

  return (
    <StampModal
      visible={visible}
      title="IMPORT OBSIDIAN .MD FILE"
      subtitle="Paste markdown text from your Obsidian vault. Frontmatter, [[WikiLinks]], and tags will be parsed automatically."
      onClose={onClose}
      actions={
        <>
          <StampButton label="CANCEL" variant="tertiary" size="sm" onPress={onClose} />
          <StampButton label="IMPORT NOTE ✓" variant="primary" size="sm" onPress={handleImport} />
        </>
      }
    >
      <View style={styles.container}>
        <TextInput
          value={rawText}
          onChangeText={setRawText}
          placeholder={`---\ntitle: "My Jazz Note"\ncategory: HARMONY\ntags: [drop2, voicings]\n---\n\n# My Jazz Note\n\nContent here...`}
          placeholderTextColor={colors.inkMuted}
          multiline
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
        <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
          TIP: Notes with `[[links]]` will automatically connect to other notes in the Graph View!
        </Text>
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
    padding: 10,
    height: 220,
    textAlignVertical: 'top',
    fontSize: 12,
  },
});
