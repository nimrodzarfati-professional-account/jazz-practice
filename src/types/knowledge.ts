/**
 * Knowledge Base (Obsidian Style) Domain Types
 */

export type KnowledgeCategory =
  | 'HARMONY'
  | 'SOLOING'
  | 'COMPING'
  | 'THEORY'
  | 'ROUTINE'
  | 'STANDARDS';

export interface KnowledgeNote {
  id: string;
  title: string;
  slug: string;
  content: string; // Full markdown content (including frontmatter, [[wikilinks]], #tags)
  category: KnowledgeCategory;
  tags: string[];
  pinned?: boolean;
  relatedExerciseIds?: string[]; // IDs of exercises in Shed Engine library
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface WikiLinkReference {
  raw: string; // e.g. "[[Barry Harris Method|Barry Harris]]"
  targetTitle: string; // e.g. "Barry Harris Method"
  displayText: string; // e.g. "Barry Harris"
  resolvedNoteId?: string; // id if found in vault
  exists: boolean;
}

export interface BacklinkItem {
  sourceNoteId: string;
  sourceNoteTitle: string;
  sourceCategory: KnowledgeCategory;
  contextSnippet: string; // Surrounding sentence/context of the link
}

export interface GraphNode {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  connections: number; // total in + out links
  x: number;
  y: number;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type KnowledgeViewMode = 'list' | 'graph';
