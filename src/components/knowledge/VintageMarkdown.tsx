/**
 * VintageMarkdown — Obsidian-style Markdown Renderer
 *
 * Tailored for the 1959 Blue Note LP & Aged Manuscript aesthetic:
 * - Fraunces serif headings with letterpress borders
 * - Obsidian Callouts with ink stamp headers (> [!NOTE], > [!TIP], > [!CHORD])
 * - Interactive [[WikiLinks]] that navigate between knowledge notes
 * - Clickable #tags that trigger vault searches
 * - Monospaced chord progression blocks with quick copy
 * - Interactive task checklists (- [ ] / - [x])
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import {
  parseMarkdown,
  parseInlineTokens,
  MarkdownBlock,
  InlineToken,
  CalloutType,
} from '../../services/markdownParser';

interface VintageMarkdownProps {
  content: string;
  onPressWikiLink?: (targetTitle: string) => void;
  onPressTag?: (tag: string) => void;
  style?: ViewStyle;
}

export const VintageMarkdown: React.FC<VintageMarkdownProps> = ({
  content,
  onPressWikiLink,
  onPressTag,
  style,
}) => {
  const { colors, typography } = useTheme();
  const blocks = parseMarkdown(content);

  const renderInlineTokens = (
    text: string,
    baseTextStyle: any,
    inlineKeyPrefix: string
  ) => {
    const tokens = parseInlineTokens(text);

    return tokens.map((token: InlineToken, idx: number) => {
      const key = `${inlineKeyPrefix}_${idx}`;

      switch (token.type) {
        case 'wikilink': {
          return (
            <Pressable
              key={key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onPressWikiLink && token.target) {
                  onPressWikiLink(token.target);
                }
              }}
              style={({ pressed }) => [
                styles.wikiLinkBadge,
                {
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.primary : colors.recessedSurface,
                },
              ]}
            >
              <Text
                style={[
                  typography.monoBold,
                  styles.wikiLinkText,
                  { color: colors.primary },
                ]}
              >
                ☍ [[{token.text}]]
              </Text>
            </Pressable>
          );
        }

        case 'tag': {
          return (
            <Pressable
              key={key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (onPressTag && token.target) {
                  onPressTag(token.target);
                }
              }}
              style={({ pressed }) => [
                styles.tagBadge,
                {
                  borderColor: colors.inkMuted,
                  backgroundColor: pressed ? colors.tertiary : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  typography.stampSmall,
                  styles.tagText,
                  { color: colors.tertiary },
                ]}
              >
                {token.text.toUpperCase()}
              </Text>
            </Pressable>
          );
        }

        case 'bold': {
          return (
            <Text
              key={key}
              style={[
                baseTextStyle,
                {
                  fontFamily: typography.fontHeading,
                  fontWeight: '700',
                  color: colors.inkBlack,
                },
              ]}
            >
              {token.text}
            </Text>
          );
        }

        case 'italic': {
          return (
            <Text
              key={key}
              style={[
                baseTextStyle,
                {
                  fontStyle: 'italic',
                  color: colors.inkBlack,
                },
              ]}
            >
              {token.text}
            </Text>
          );
        }

        case 'code': {
          return (
            <Text
              key={key}
              style={[
                typography.mono,
                styles.inlineCode,
                {
                  backgroundColor: colors.recessedSurface,
                  color: colors.primary,
                  borderColor: colors.inkMuted,
                },
              ]}
            >
              {` ${token.text} `}
            </Text>
          );
        }

        case 'strikethrough': {
          return (
            <Text
              key={key}
              style={[
                baseTextStyle,
                {
                  textDecorationLine: 'line-through',
                  color: colors.inkMuted,
                },
              ]}
            >
              {token.text}
            </Text>
          );
        }

        case 'link': {
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (token.target) Linking.openURL(token.target);
              }}
            >
              <Text
                style={[
                  baseTextStyle,
                  {
                    color: colors.primary,
                    textDecorationLine: 'underline',
                  },
                ]}
              >
                {token.text}
              </Text>
            </Pressable>
          );
        }

        default:
          return (
            <Text key={key} style={baseTextStyle}>
              {token.text}
            </Text>
          );
      }
    });
  };

  const getCalloutMeta = (type: CalloutType) => {
    switch (type) {
      case 'TIP':
        return {
          stamp: '[ JAZZ TIP ]',
          border: colors.primary,
          bg: colors.cardSurface,
          toneColor: colors.primary,
        };
      case 'WARNING':
        return {
          stamp: '[ CAUTION ]',
          border: colors.secondary,
          bg: colors.cardSurface,
          toneColor: colors.secondary,
        };
      case 'CHORD':
        return {
          stamp: '[ HARMONY ]',
          border: colors.tertiary,
          bg: colors.cardSurface,
          toneColor: colors.tertiary,
        };
      case 'QUOTE':
        return {
          stamp: '[ QUOTE ]',
          border: colors.olive,
          bg: colors.cardSurface,
          toneColor: colors.olive,
        };
      case 'IMPORTANT':
        return {
          stamp: '[ CRITICAL ]',
          border: colors.primary,
          bg: colors.cardSurface,
          toneColor: colors.primary,
        };
      case 'NOTE':
      default:
        return {
          stamp: '[ NOTE ]',
          border: colors.inkBlack,
          bg: colors.cardSurface,
          toneColor: colors.inkBlack,
        };
    }
  };

  return (
    <View style={[styles.root, style]}>
      {blocks.map((block: MarkdownBlock, blockIdx: number) => {
        const blockKey = `b_${blockIdx}`;

        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <View
                  key={blockKey}
                  style={[styles.h1Container, { borderBottomColor: colors.primary }]}
                >
                  <Text style={[typography.title, styles.h1, { color: colors.inkBlack }]}>
                    {block.text}
                  </Text>
                </View>
              );
            }
            if (block.level === 2) {
              return (
                <View
                  key={blockKey}
                  style={[styles.h2Container, { borderBottomColor: colors.inkBlack }]}
                >
                  <Text style={[typography.heading, styles.h2, { color: colors.inkBlack }]}>
                    {block.text}
                  </Text>
                </View>
              );
            }
            return (
              <Text
                key={blockKey}
                style={[typography.heading, styles.h3, { color: colors.primary }]}
              >
                {block.text}
              </Text>
            );
          }

          case 'callout': {
            const meta = getCalloutMeta(block.calloutType);
            return (
              <View
                key={blockKey}
                style={[
                  styles.calloutCard,
                  {
                    borderColor: meta.border,
                    backgroundColor: meta.bg,
                  },
                ]}
              >
                <View style={[styles.calloutHeader, { borderBottomColor: meta.border }]}>
                  <Text style={[typography.stamp, { color: meta.toneColor }]}>
                    {meta.stamp}
                  </Text>
                  {block.title && block.title !== block.calloutType ? (
                    <Text
                      style={[
                        typography.stamp,
                        styles.calloutTitle,
                        { color: colors.inkBlack },
                      ]}
                    >
                      {block.title}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.calloutBody}>
                  <Text style={[typography.mono, styles.calloutText, { color: colors.inkBlack }]}>
                    {renderInlineTokens(
                      block.content,
                      [typography.mono, { color: colors.inkBlack }],
                      `${blockKey}_callout`
                    )}
                  </Text>
                </View>
              </View>
            );
          }

          case 'code': {
            const isChord =
              block.language.toLowerCase() === 'chord' ||
              block.code.includes('|') ||
              block.code.includes('maj') ||
              block.code.includes('m7');

            return (
              <View
                key={blockKey}
                style={[
                  styles.codeBlockCard,
                  {
                    borderColor: colors.inkBlack,
                    backgroundColor: colors.recessedSurface,
                  },
                ]}
              >
                <View style={[styles.codeBlockHeader, { borderBottomColor: colors.inkBlack }]}>
                  <Text style={[typography.stampSmall, { color: colors.inkMuted }]}>
                    {isChord ? '♫ CHORD CHART' : block.language.toUpperCase() || 'CODE'}
                  </Text>
                </View>
                <Text style={[typography.monoBold, styles.codeText, { color: colors.inkBlack }]}>
                  {block.code}
                </Text>
              </View>
            );
          }

          case 'list': {
            return (
              <View key={blockKey} style={styles.listContainer}>
                {block.items.map((item, itemIdx) => (
                  <View key={`${blockKey}_item_${itemIdx}`} style={styles.listItemRow}>
                    {item.isTask ? (
                      <View
                        style={[
                          styles.taskCheckbox,
                          {
                            borderColor: colors.inkBlack,
                            backgroundColor: item.checked ? colors.primary : colors.cardSurface,
                          },
                        ]}
                      >
                        {item.checked ? (
                          <Text style={[typography.stampSmall, { color: colors.onDark, fontSize: 9 }]}>
                            ✓
                          </Text>
                        ) : null}
                      </View>
                    ) : block.ordered ? (
                      <Text
                        style={[
                          typography.stamp,
                          styles.bulletMarker,
                          { color: colors.primary },
                        ]}
                      >
                        {item.index}.
                      </Text>
                    ) : (
                      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                    )}

                    <Text
                      style={[
                        typography.mono,
                        styles.listItemText,
                        { color: colors.inkBlack },
                        item.checked && {
                          textDecorationLine: 'line-through',
                          color: colors.inkMuted,
                        },
                      ]}
                    >
                      {renderInlineTokens(
                        item.text,
                        [typography.mono, { color: colors.inkBlack }],
                        `${blockKey}_li_${itemIdx}`
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }

          case 'quote': {
            return (
              <View
                key={blockKey}
                style={[
                  styles.quoteContainer,
                  {
                    borderLeftColor: colors.primary,
                    backgroundColor: colors.recessedSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.heading,
                    styles.quoteText,
                    { color: colors.inkBlack, fontStyle: 'italic' },
                  ]}
                >
                  “{block.text}”
                </Text>
              </View>
            );
          }

          case 'divider': {
            return (
              <View
                key={blockKey}
                style={[styles.divider, { borderBottomColor: colors.inkBlack }]}
              />
            );
          }

          case 'paragraph': {
            return (
              <Text
                key={blockKey}
                style={[
                  typography.mono,
                  styles.paragraph,
                  { color: colors.inkBlack },
                ]}
              >
                {renderInlineTokens(
                  block.text,
                  [typography.mono, styles.bodyText, { color: colors.inkBlack }],
                  blockKey
                )}
              </Text>
            );
          }

          default:
            return null;
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  h1Container: {
    borderBottomWidth: 2.5,
    paddingBottom: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  h1: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  h2Container: {
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginTop: 14,
    marginBottom: 2,
  },
  h2: {
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  h3: {
    fontSize: 14,
    marginTop: 10,
  },
  paragraph: {
    lineHeight: 20,
    fontSize: 13,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  inlineCode: {
    fontSize: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  wikiLinkBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'baseline',
    marginHorizontal: 2,
    marginVertical: 1,
  },
  wikiLinkText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tagBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'baseline',
    marginHorizontal: 2,
  },
  tagText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  calloutCard: {
    borderWidth: 2,
    marginVertical: 6,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calloutTitle: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  calloutBody: {
    padding: 10,
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 18,
  },
  codeBlockCard: {
    borderWidth: 2,
    marginVertical: 6,
  },
  codeBlockHeader: {
    borderBottomWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    padding: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  listContainer: {
    gap: 6,
    marginVertical: 4,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    marginTop: 7,
  },
  bulletMarker: {
    fontSize: 12,
    minWidth: 16,
  },
  taskCheckbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  quoteContainer: {
    borderLeftWidth: 3.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    borderBottomWidth: 1.5,
    marginVertical: 10,
  },
});
