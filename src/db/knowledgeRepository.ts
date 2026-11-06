/**
 * Knowledge Base (Obsidian Style) Repository
 *
 * Handles storage, querying, graph synthesis, and import/export of Markdown notes.
 * Uses the resilient app_settings layer for native SQLite and web localStorage sync.
 */
import {
  KnowledgeNote,
  KnowledgeCategory,
  BacklinkItem,
  WikiLinkReference,
  KnowledgeGraphData,
  GraphNode,
  GraphEdge,
} from '../types/knowledge';
import { getAppSetting, setAppSetting, initDatabase } from './repository';
import { SEED_KNOWLEDGE_NOTES } from './seedKnowledge';
import {
  extractFrontmatter,
  extractTags,
  extractWikiLinks,
  generateSlug,
} from '../services/markdownParser';

const KNOWLEDGE_NOTES_SETTING_KEY = 'shed_v2_knowledge_notes_json';

let onCloudPushNote: ((note: KnowledgeNote) => void) | null = null;
let onCloudDeleteNote: ((id: string) => void) | null = null;

export function registerKnowledgeCloudHandlers(handlers: {
  pushNote: (note: KnowledgeNote) => void;
  deleteNote: (id: string) => void;
}): void {
  onCloudPushNote = handlers.pushNote;
  onCloudDeleteNote = handlers.deleteNote;
}

/**
 * Normalizes title for comparison
 */
function normalizeTitle(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieve all knowledge notes from the database.
 * Seeds initial notes on first run if none exist.
 */
export function getKnowledgeNotes(): KnowledgeNote[] {
  initDatabase();
  const raw = getAppSetting(KNOWLEDGE_NOTES_SETTING_KEY);

  if (!raw) {
    // Seed initial notes
    setKnowledgeNotes(SEED_KNOWLEDGE_NOTES);
    return SEED_KNOWLEDGE_NOTES;
  }

  try {
    const list = JSON.parse(raw) as KnowledgeNote[];
    if (!Array.isArray(list) || list.length === 0) {
      setKnowledgeNotes(SEED_KNOWLEDGE_NOTES);
      return SEED_KNOWLEDGE_NOTES;
    }
    return list.sort((a, b) => {
      // Pinned notes first, then by latest updatedAt
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  } catch (err) {
    console.warn('[KnowledgeRepository] Failed to parse notes JSON:', err);
    return SEED_KNOWLEDGE_NOTES;
  }
}

/**
 * Internal setter to persist the notes list
 */
function setKnowledgeNotes(notes: KnowledgeNote[]): void {
  initDatabase();
  setAppSetting(KNOWLEDGE_NOTES_SETTING_KEY, JSON.stringify(notes));
}

/**
 * Retrieve a note by ID
 */
export function getNoteById(id: string): KnowledgeNote | null {
  const notes = getKnowledgeNotes();
  return notes.find((n) => n.id === id) || null;
}

/**
 * Retrieve a note by title, slug, or approximate name
 */
export function getNoteByTitleOrSlug(query: string): KnowledgeNote | null {
  const notes = getKnowledgeNotes();
  const targetNorm = normalizeTitle(query);
  const targetSlug = generateSlug(query);

  // Exact slug match
  let found = notes.find((n) => n.slug === targetSlug);
  if (found) return found;

  // Normalized title exact match
  found = notes.find((n) => normalizeTitle(n.title) === targetNorm);
  if (found) return found;

  // Partial substring match (if title contains query or query contains title)
  found = notes.find(
    (n) =>
      normalizeTitle(n.title).includes(targetNorm) ||
      targetNorm.includes(normalizeTitle(n.title))
  );

  return found || null;
}

/**
 * Save or create a markdown note
 */
export function saveKnowledgeNote(
  noteInput: Partial<KnowledgeNote> & { title: string; content: string }
): KnowledgeNote {
  const notes = getKnowledgeNotes();
  const nowIso = new Date().toISOString();

  // Parse frontmatter & tags from markdown content
  const { frontmatter, body } = extractFrontmatter(noteInput.content);
  const detectedTags = extractTags(body);
  const frontmatterTags: string[] = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  const mergedTags = Array.from(
    new Set([...(noteInput.tags || []), ...frontmatterTags, ...detectedTags])
  );

  const category: KnowledgeCategory =
    noteInput.category || frontmatter.category || 'THEORY';

  const slug = generateSlug(noteInput.title);

  let savedNote: KnowledgeNote;

  if (noteInput.id) {
    const existingIndex = notes.findIndex((n) => n.id === noteInput.id);
    if (existingIndex >= 0) {
      savedNote = {
        ...notes[existingIndex],
        ...noteInput,
        slug,
        category,
        tags: mergedTags,
        updatedAt: nowIso,
      };
      notes[existingIndex] = savedNote;
    } else {
      savedNote = {
        id: noteInput.id,
        title: noteInput.title,
        slug,
        content: noteInput.content,
        category,
        tags: mergedTags,
        pinned: Boolean(noteInput.pinned),
        relatedExerciseIds: noteInput.relatedExerciseIds || [],
        createdAt: noteInput.createdAt || nowIso,
        updatedAt: nowIso,
      };
      notes.unshift(savedNote);
    }
  } else {
    // Generate new ID
    const newId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    savedNote = {
      id: newId,
      title: noteInput.title,
      slug,
      content: noteInput.content,
      category,
      tags: mergedTags,
      pinned: Boolean(noteInput.pinned),
      relatedExerciseIds: noteInput.relatedExerciseIds || [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    notes.unshift(savedNote);
  }

  setKnowledgeNotes(notes);
  if (onCloudPushNote) {
    onCloudPushNote(savedNote);
  }
  return savedNote;
}

/**
 * Delete a note by ID
 */
export function deleteKnowledgeNote(id: string): void {
  const notes = getKnowledgeNotes();
  const updated = notes.filter((n) => n.id !== id);
  setKnowledgeNotes(updated);
  if (onCloudDeleteNote) {
    onCloudDeleteNote(id);
  }
}

/**
 * Toggle pinned status of a note
 */
export function togglePinNote(id: string): boolean {
  const notes = getKnowledgeNotes();
  const target = notes.find((n) => n.id === id);
  if (!target) return false;
  target.pinned = !target.pinned;
  target.updatedAt = new Date().toISOString();
  setKnowledgeNotes(notes);
  if (onCloudPushNote) {
    onCloudPushNote(target);
  }
  return target.pinned;
}

/**
 * Merges knowledge notes pulled from cloud into local store (called by CloudSyncService)
 */
export function upsertLocalKnowledgeNotesFromCloud(cloudNotes: KnowledgeNote[]): void {
  initDatabase();
  const localNotes = getKnowledgeNotes();
  const map = new Map<string, KnowledgeNote>();
  for (const n of localNotes) map.set(n.id, n);

  for (const cn of cloudNotes) {
    const existing = map.get(cn.id);
    if (!existing || new Date(cn.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      map.set(cn.id, cn);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  setKnowledgeNotes(merged);
}

/**
 * Update a single knowledge note from a Realtime event (called by CloudSyncService)
 */
export function upsertSingleKnowledgeNoteFromCloud(note: KnowledgeNote): boolean {
  initDatabase();
  const localNotes = getKnowledgeNotes();
  const existing = localNotes.find((n) => n.id === note.id);
  if (!existing || new Date(note.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
    upsertLocalKnowledgeNotesFromCloud([note]);
    return true;
  }
  return false;
}

/**
 * Delete a local note on remote Realtime delete event (called by CloudSyncService)
 */
export function deleteLocalKnowledgeNoteFromCloud(id: string): void {
  initDatabase();
  const localNotes = getKnowledgeNotes();
  const filtered = localNotes.filter((n) => n.id !== id);
  setKnowledgeNotes(filtered);
}

/**
 * Find all backlinks mentioning targetTitle across all notes
 */
export function getBacklinks(
  targetTitle: string,
  allNotes: KnowledgeNote[]
): BacklinkItem[] {
  const targetNorm = normalizeTitle(targetTitle);
  const backlinks: BacklinkItem[] = [];

  for (const note of allNotes) {
    if (normalizeTitle(note.title) === targetNorm) continue; // Don't link to self

    const links = extractWikiLinks(note.content);
    const mentionsTarget = links.some(
      (l) =>
        normalizeTitle(l.title) === targetNorm ||
        targetNorm.includes(normalizeTitle(l.title)) ||
        normalizeTitle(l.title).includes(targetNorm)
    );

    if (mentionsTarget) {
      // Find context snippet (the sentence or line with [[link]])
      const lines = note.content.split('\n');
      const matchingLine = lines.find((l) => l.includes('[[')) || note.title;
      const cleanSnippet = matchingLine.replace(/[#*`_>]/g, '').trim();

      backlinks.push({
        sourceNoteId: note.id,
        sourceNoteTitle: note.title,
        sourceCategory: note.category,
        contextSnippet: cleanSnippet.slice(0, 120),
      });
    }
  }

  return backlinks;
}

/**
 * Find all outgoing [[WikiLinks]] in a note, resolving whether they exist in the vault
 */
export function getOutgoingLinks(
  noteContent: string,
  allNotes: KnowledgeNote[]
): WikiLinkReference[] {
  const rawLinks = extractWikiLinks(noteContent);
  const result: WikiLinkReference[] = [];
  const seen = new Set<string>();

  for (const link of rawLinks) {
    const key = normalizeTitle(link.title);
    if (seen.has(key)) continue;
    seen.add(key);

    const resolved = allNotes.find(
      (n) =>
        normalizeTitle(n.title) === key ||
        normalizeTitle(n.title).includes(key) ||
        key.includes(normalizeTitle(n.title))
    );

    result.push({
      raw: link.raw,
      targetTitle: link.title,
      displayText: link.alias || link.title,
      resolvedNoteId: resolved?.id,
      exists: Boolean(resolved),
    });
  }

  return result;
}

/**
 * Build graph data (Nodes & Edges) with coordinates for the Obsidian Graph View
 */
export function buildKnowledgeGraph(allNotes: KnowledgeNote[]): KnowledgeGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const connectionCounts = new Map<string, number>();

  // Initialize connection map
  allNotes.forEach((n) => connectionCounts.set(n.id, 0));

  // Calculate links and edges
  for (const source of allNotes) {
    const outgoing = getOutgoingLinks(source.content, allNotes);
    for (const link of outgoing) {
      if (link.resolvedNoteId && link.resolvedNoteId !== source.id) {
        edges.push({
          sourceId: source.id,
          targetId: link.resolvedNoteId,
        });
        connectionCounts.set(
          source.id,
          (connectionCounts.get(source.id) || 0) + 1
        );
        connectionCounts.set(
          link.resolvedNoteId,
          (connectionCounts.get(link.resolvedNoteId) || 0) + 1
        );
      }
    }
  }

  // Layout algorithm: Distribute nodes radially around a center with jitter
  const total = allNotes.length;
  const centerX = 360;
  const centerY = 320;
  const baseRadius = Math.min(260, 60 + total * 18);

  allNotes.forEach((note, index) => {
    // Arrange in a spiral / golden ratio distribution
    const angle = index * (Math.PI * (3 - Math.sqrt(5))) + (index % 2) * 0.4;
    const connections = connectionCounts.get(note.id) || 0;
    // Hubs (higher connection count) gravitate towards the center
    const radiusFactor = connections > 3 ? 0.45 : connections > 1 ? 0.75 : 1.0;
    const currentRadius = baseRadius * radiusFactor + ((index * 37) % 40) - 20;

    const x = Math.round(centerX + currentRadius * Math.cos(angle));
    const y = Math.round(centerY + currentRadius * Math.sin(angle));

    nodes.push({
      id: note.id,
      title: note.title,
      category: note.category,
      tags: note.tags,
      connections,
      x,
      y,
    });
  });

  return { nodes, edges };
}

/**
 * Export a note as a standard markdown file string with YAML frontmatter
 */
export function exportNoteAsMarkdown(note: KnowledgeNote): string {
  const frontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `category: ${note.category}`,
    `tags: [${note.tags.map((t) => `"${t}"`).join(', ')}]`,
    `updated: "${note.updatedAt}"`,
    '---',
    '',
  ].join('\n');

  // Strip existing frontmatter if duplicate
  const { body } = extractFrontmatter(note.content);
  return `${frontmatter}\n${body.trim()}\n`;
}

/**
 * Import a note from markdown text
 */
export function importNoteFromMarkdown(
  markdownText: string,
  fallbackTitle?: string
): KnowledgeNote {
  const { frontmatter, body } = extractFrontmatter(markdownText);
  let title = frontmatter.title || fallbackTitle;

  // If no title yet, check for first # Heading in markdown
  if (!title) {
    const headingMatch = /^#\s+(.+)$/m.exec(body);
    if (headingMatch) {
      title = headingMatch[1].trim();
    }
  }

  if (!title) {
    title = `Note ${new Date().toLocaleDateString()}`;
  }

  const category: KnowledgeCategory =
    frontmatter.category &&
    ['HARMONY', 'SOLOING', 'COMPING', 'THEORY', 'ROUTINE', 'STANDARDS'].includes(
      frontmatter.category
    )
      ? frontmatter.category
      : 'THEORY';

  return saveKnowledgeNote({
    title,
    content: markdownText,
    category,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
  });
}

/**
 * Reset knowledge base back to the initial seed notes
 */
export function resetKnowledgeBaseToSeed(): void {
  setKnowledgeNotes(SEED_KNOWLEDGE_NOTES);
}
