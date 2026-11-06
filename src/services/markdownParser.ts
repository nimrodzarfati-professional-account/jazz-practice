/**
 * Obsidian-Style Markdown Parser for Vintage Shed Engine
 *
 * Lightweight, zero-dependency AST parser supporting:
 * - YAML Frontmatter
 * - Obsidian Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CHORD], > [!QUOTE]
 * - WikiLinks: [[Target Note]] and [[Target Note|Custom Alias]]
 * - Hashtags: #bebop, #theory
 * - Headings: #, ##, ###, ####
 * - Lists: Bullets, Numbered, Task Lists (- [ ] / - [x])
 * - Fenced code & chord blocks (```chord)
 * - Blockquotes: > quote
 * - Horizontal rules: ---
 * - Inline formatting: bold, italic, strikethrough, inline code, web links
 */

export type CalloutType = 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT' | 'CHORD' | 'QUOTE';

export interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'strikethrough' | 'wikilink' | 'tag' | 'link';
  text: string;
  target?: string; // For wikilink target note title or web link URL
  alias?: string; // For wikilink alias
}

export interface ListItemToken {
  text: string;
  isTask: boolean;
  checked?: boolean;
  index?: number;
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'callout'; calloutType: CalloutType; title: string; content: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'list'; ordered: boolean; items: ListItemToken[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

/**
 * Generate a URL/safe slug from note title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse YAML-style Frontmatter at the top of markdown
 */
export function extractFrontmatter(markdown: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const frontmatter: Record<string, any> = {};
  const trimmed = markdown.trim();

  if (!trimmed.startsWith('---')) {
    return { frontmatter, body: markdown };
  }

  const endMarkerIndex = trimmed.indexOf('\n---', 3);
  if (endMarkerIndex === -1) {
    return { frontmatter, body: markdown };
  }

  const rawYaml = trimmed.substring(3, endMarkerIndex).trim();
  const body = trimmed.substring(endMarkerIndex + 4).trim();

  for (const line of rawYaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let val = line.substring(colonIdx + 1).trim();

      // Check for array e.g. [theory, voicings]
      if (val.startsWith('[') && val.endsWith(']')) {
        const arr = val
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
        frontmatter[key] = arr;
      } else {
        // Strip quotes
        val = val.replace(/^['"]|['"]$/g, '');
        frontmatter[key] = val;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Extract all WikiLinks from markdown string: [[Target]] or [[Target|Alias]]
 */
export function extractWikiLinks(
  content: string
): { raw: string; title: string; alias?: string }[] {
  const regex = /\[\[(.*?)\]\]/g;
  const links: { raw: string; title: string; alias?: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[0];
    const inner = match[1].trim();
    if (!inner) continue;

    if (inner.includes('|')) {
      const [title, alias] = inner.split('|');
      links.push({
        raw,
        title: title.trim(),
        alias: alias.trim(),
      });
    } else {
      links.push({
        raw,
        title: inner,
      });
    }
  }

  return links;
}

/**
 * Extract all hashtags: #jazz, #bebop (ignoring markdown headings e.g. # Heading)
 */
export function extractTags(content: string): string[] {
  const tagSet = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      continue;
    }
    // Skip code block lines
    if (trimmed.startsWith('```')) {
      continue;
    }

    const regex = /(?:^|\s)#([a-zA-Z0-9_\-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const tag = match[1].toLowerCase();
      // Ignore bare numbers or color hex codes
      if (!/^\d+$/.test(tag) && !/^[0-9a-fA-F]{3,6}$/.test(tag)) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet);
}

/**
 * Parse inline markdown tokens (WikiLinks, tags, bold, italic, code, links)
 */
export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;
  const len = text.length;

  while (cursor < len) {
    // Check for WikiLink: [[Target|Alias]] or [[Target]]
    if (text.startsWith('[[', cursor)) {
      const endIdx = text.indexOf(']]', cursor + 2);
      if (endIdx !== -1) {
        const rawContent = text.slice(cursor + 2, endIdx).trim();
        let title = rawContent;
        let alias: string | undefined = undefined;
        if (rawContent.includes('|')) {
          const parts = rawContent.split('|');
          title = parts[0].trim();
          alias = parts[1].trim();
        }
        tokens.push({
          type: 'wikilink',
          text: alias || title,
          target: title,
          alias,
        });
        cursor = endIdx + 2;
        continue;
      }
    }

    // Check for Hashtag: #tag (word boundary or preceded by space/start)
    if (text[cursor] === '#' && (cursor === 0 || /\s/.test(text[cursor - 1]))) {
      const rest = text.slice(cursor + 1);
      const match = /^([a-zA-Z0-9_\-]+)/.exec(rest);
      if (match && !/^\d+$/.test(match[1])) {
        const tagName = match[1];
        tokens.push({
          type: 'tag',
          text: '#' + tagName,
          target: tagName.toLowerCase(),
        });
        cursor += 1 + tagName.length;
        continue;
      }
    }

    // Check for Bold: **bold** or __bold__
    if (text.startsWith('**', cursor) || text.startsWith('__', cursor)) {
      const marker = text.slice(cursor, cursor + 2);
      const endIdx = text.indexOf(marker, cursor + 2);
      if (endIdx !== -1) {
        const inner = text.slice(cursor + 2, endIdx);
        tokens.push({ type: 'bold', text: inner });
        cursor = endIdx + 2;
        continue;
      }
    }

    // Check for Italic: *italic* or _italic_
    if (
      (text[cursor] === '*' || text[cursor] === '_') &&
      !text.startsWith('**', cursor) &&
      !text.startsWith('__', cursor)
    ) {
      const marker = text[cursor];
      const endIdx = text.indexOf(marker, cursor + 1);
      if (endIdx !== -1 && endIdx > cursor + 1) {
        const inner = text.slice(cursor + 1, endIdx);
        tokens.push({ type: 'italic', text: inner });
        cursor = endIdx + 1;
        continue;
      }
    }

    // Check for Inline Code: `code`
    if (text[cursor] === '`') {
      const endIdx = text.indexOf('`', cursor + 1);
      if (endIdx !== -1) {
        const inner = text.slice(cursor + 1, endIdx);
        tokens.push({ type: 'code', text: inner });
        cursor = endIdx + 1;
        continue;
      }
    }

    // Check for Strikethrough: ~~del~~
    if (text.startsWith('~~', cursor)) {
      const endIdx = text.indexOf('~~', cursor + 2);
      if (endIdx !== -1) {
        const inner = text.slice(cursor + 2, endIdx);
        tokens.push({ type: 'strikethrough', text: inner });
        cursor = endIdx + 2;
        continue;
      }
    }

    // Check for Web link: [title](url)
    if (text[cursor] === '[') {
      const closeBracket = text.indexOf(']', cursor + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const title = text.slice(cursor + 1, closeBracket);
          const url = text.slice(closeBracket + 2, closeParen);
          tokens.push({
            type: 'link',
            text: title,
            target: url,
          });
          cursor = closeParen + 1;
          continue;
        }
      }
    }

    // Regular character accumulation
    let nextSpecial = len;
    const specialChars = ['[', '#', '*', '_', '`', '~'];
    for (const ch of specialChars) {
      const idx = text.indexOf(ch, cursor);
      if (idx !== -1 && idx < nextSpecial) {
        // If it's #, only trigger if at start or preceded by whitespace
        if (ch === '#' && idx > 0 && !/\s/.test(text[idx - 1])) {
          continue;
        }
        nextSpecial = idx;
      }
    }

    if (nextSpecial > cursor) {
      tokens.push({
        type: 'text',
        text: text.slice(cursor, nextSpecial),
      });
      cursor = nextSpecial;
    } else {
      tokens.push({
        type: 'text',
        text: text[cursor],
      });
      cursor++;
    }
  }

  // Merge consecutive text tokens
  const merged: InlineToken[] = [];
  for (const t of tokens) {
    if (merged.length > 0 && merged[merged.length - 1].type === 'text' && t.type === 'text') {
      merged[merged.length - 1].text += t.text;
    } else {
      merged.push(t);
    }
  }

  return merged;
}

/**
 * Parse full markdown document into structured blocks
 */
export function parseMarkdown(content: string): MarkdownBlock[] {
  const { body } = extractFrontmatter(content);
  const lines = body.split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule: --- or ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Headings: # H1, ## H2, ### H3, #### H4
    if (trimmed.startsWith('#')) {
      const match = /^(#{1,4})\s+(.+)$/.exec(trimmed);
      if (match) {
        const level = match[1].length as 1 | 2 | 3 | 4;
        blocks.push({
          type: 'heading',
          level,
          text: match[2].trim(),
        });
        i++;
        continue;
      }
    }

    // Fenced Code Block: ```language ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Obsidian Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CHORD], > [!QUOTE]
    if (trimmed.startsWith('>') && /\[!(NOTE|TIP|WARNING|IMPORTANT|CHORD|QUOTE)\]/i.test(trimmed)) {
      const calloutMatch = />\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CHORD|QUOTE)\]\s*(.*)$/i.exec(trimmed);
      const calloutType = (calloutMatch ? calloutMatch[1].toUpperCase() : 'NOTE') as CalloutType;
      const customTitle = calloutMatch && calloutMatch[2].trim() ? calloutMatch[2].trim() : '';

      const contentLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextTrim = lines[i].trim();
        if (nextTrim.startsWith('>')) {
          contentLines.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        } else if (!nextTrim) {
          // Empty line might belong to callout if next line also starts with >
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
            contentLines.push('');
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      blocks.push({
        type: 'callout',
        calloutType,
        title: customTitle || calloutType,
        content: contentLines.join('\n').trim(),
      });
      continue;
    }

    // Regular Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        text: quoteLines.join('\n').trim(),
      });
      continue;
    }

    // Unordered List or Task List: - or *
    if (/^[-*]\s+/.test(trimmed)) {
      const items: ListItemToken[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemLine = lines[i].trim().replace(/^[-*]\s+/, '');
        // Check for task checklist: [ ] or [x]
        const taskMatch = /^\[([ xX])\]\s+(.+)$/.exec(itemLine);
        if (taskMatch) {
          items.push({
            text: taskMatch[2],
            isTask: true,
            checked: taskMatch[1].toLowerCase() === 'x',
          });
        } else {
          items.push({
            text: itemLine,
            isTask: false,
          });
        }
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items,
      });
      continue;
    }

    // Ordered List: 1. Item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: ListItemToken[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemLine = lines[i].trim().replace(/^\d+\.\s+/, '');
        items.push({
          text: itemLine,
          isTask: false,
          index: num++,
        });
        i++;
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items,
      });
      continue;
    }

    // Regular Paragraph: accumulate until empty line or special block
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      lines[i].trim() !== '---'
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paraLines.join('\n'),
      });
    }
  }

  return blocks;
}
