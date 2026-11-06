/**
 * GraphView — Obsidian-Style Interactive Knowledge Network
 *
 * Visualizes the interconnected web of jazz notes:
 * - Hub nodes sized according to connection degrees
 * - Tone-coded by category (Sienna = Soloing, Brass = Comping, Olive = Routine, Oxblood = Theory)
 * - Tapping a node spotlights its direct connections and shows an inspector card
 * - Zoom & Pan canvas with search filter
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { KnowledgeNote, KnowledgeGraphData, GraphNode } from '../../types/knowledge';
import { buildKnowledgeGraph } from '../../db/knowledgeRepository';
import { StampBadge } from '../StampBadge';
import { StampButton } from '../StampButton';

interface GraphViewProps {
  notes: KnowledgeNote[];
  onSelectNote: (noteId: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ notes, onSelectNote }) => {
  const { colors, typography } = useTheme();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const graphData: KnowledgeGraphData = useMemo(() => {
    return buildKnowledgeGraph(notes);
  }, [notes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData.nodes]);

  const selectedNoteFull = useMemo(() => {
    if (!selectedNodeId) return null;
    return notes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, notes]);

  // Compute connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    for (const edge of graphData.edges) {
      if (edge.sourceId === selectedNodeId) set.add(edge.targetId);
      if (edge.targetId === selectedNodeId) set.add(edge.sourceId);
    }
    return set;
  }, [selectedNodeId, graphData.edges]);

  const handleNodePress = (node: GraphNode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
    }
  };

  const getNodeColor = (category: string) => {
    switch (category) {
      case 'SOLOING':
        return colors.primary;
      case 'COMPING':
        return colors.tertiary;
      case 'THEORY':
        return colors.secondary;
      case 'ROUTINE':
      case 'MAINTENANCE':
        return colors.olive;
      default:
        return colors.primary;
    }
  };

  const canvasWidth = 720;
  const canvasHeight = 640;

  return (
    <View style={[styles.root, { backgroundColor: colors.canvasBg }]}>
      {/* Top Controls Toolbar */}
      <View style={[styles.controlsBar, { backgroundColor: colors.cardSurface, borderColor: colors.inkBlack }]}>
        <View style={styles.searchRow}>
          <Text style={[typography.stamp, { color: colors.inkMuted }]}>FILTER GRAPH:</Text>
          <TextInput
            value={filterQuery}
            onChangeText={setFilterQuery}
            placeholder="Search nodes or tags..."
            placeholderTextColor={colors.inkMuted}
            style={[
              typography.mono,
              styles.graphSearchInput,
              {
                borderColor: colors.inkBlack,
                backgroundColor: colors.recessedSurface,
                color: colors.inkBlack,
              },
            ]}
          />
        </View>

        <View style={styles.zoomButtonsRow}>
          <Pressable
            onPress={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            style={[styles.zoomBtn, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}
          >
            <Text style={[typography.monoBold, { color: colors.inkBlack }]}>-</Text>
          </Pressable>
          <Pressable
            onPress={() => setZoomLevel(1)}
            style={[styles.zoomBtn, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}
          >
            <Text style={[typography.stampSmall, { color: colors.inkBlack }]}>
              {Math.round(zoomLevel * 100)}%
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setZoomLevel((z) => Math.min(1.4, z + 0.15))}
            style={[styles.zoomBtn, { borderColor: colors.inkBlack, backgroundColor: colors.recessedSurface }]}
          >
            <Text style={[typography.monoBold, { color: colors.inkBlack }]}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Interactive 2D Graph Canvas */}
      <ScrollView
        horizontal
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
        style={styles.scrollCanvas}
        showsHorizontalScrollIndicator={false}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={[
              styles.graphCanvas,
              {
                width: canvasWidth * zoomLevel,
                height: canvasHeight * zoomLevel,
                transform: [{ scale: zoomLevel }],
              },
            ]}
          >
            {/* Draw Connecting Edges */}
            {graphData.edges.map((edge, idx) => {
              const source = graphData.nodes.find((n) => n.id === edge.sourceId);
              const target = graphData.nodes.find((n) => n.id === edge.targetId);
              if (!source || !target) return null;

              const isEdgeHighlighted =
                selectedNodeId &&
                (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);

              const isEdgeDimmed = selectedNodeId && !isEdgeHighlighted;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const cx = (source.x + target.x) / 2;
              const cy = (source.y + target.y) / 2;
              const thickness = isEdgeHighlighted ? 2.5 : 1;

              return (
                <View
                  key={`edge_${edge.sourceId}_${edge.targetId}_${idx}`}
                  style={[
                    styles.edgeLine,
                    {
                      width: distance,
                      height: thickness,
                      left: cx - distance / 2,
                      top: cy - thickness / 2,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: isEdgeHighlighted
                        ? colors.tertiary
                        : colors.inkMuted,
                      opacity: isEdgeDimmed ? 0.12 : isEdgeHighlighted ? 1 : 0.35,
                    },
                  ]}
                />
              );
            })}

            {/* Draw Nodes */}
            {graphData.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const nodeTitle = node.title || '';
              const nodeTags = Array.isArray(node.tags) ? node.tags : [];
              const q = filterQuery.toLowerCase();
              const matchesFilter =
                !filterQuery ||
                nodeTitle.toLowerCase().includes(q) ||
                nodeTags.some((t) => (t || '').toLowerCase().includes(q));

              const isDimmed =
                !matchesFilter ||
                (selectedNodeId && !isSelected && !isConnected);

              // Size node based on connections (Obsidian style)
              const baseSize = 36 + Math.min(24, node.connections * 5);
              const accentColor = getNodeColor(node.category);

              return (
                <Pressable
                  key={node.id}
                  onPress={() => handleNodePress(node)}
                  style={[
                    styles.nodeBubble,
                    {
                      width: baseSize,
                      height: baseSize,
                      left: node.x - baseSize / 2,
                      top: node.y - baseSize / 2,
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.cardSurface,
                      borderColor: isSelected
                        ? colors.tertiary
                        : accentColor,
                      borderWidth: isSelected ? 3 : 2,
                      opacity: isDimmed ? 0.25 : 1,
                      zIndex: isSelected ? 10 : 2,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.stampSmall,
                      styles.nodeStamp,
                      {
                        color: isSelected ? colors.onAccent : colors.inkBlack,
                        fontSize: Math.max(9, Math.min(12, baseSize / 4)),
                      },
                    ]}
                  >
                    {node.connections > 0 ? `☍${node.connections}` : '•'}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      typography.monoBold,
                      styles.nodeLabel,
                      {
                        color: isSelected ? colors.primary : colors.textPrimary,
                        backgroundColor: colors.canvasBg,
                      },
                    ]}
                  >
                    {node.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && selectedNoteFull && (
        <View
          style={[
            styles.inspectorCard,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.inkBlack,
            },
          ]}
        >
          <View style={styles.inspectorHeader}>
            <View style={styles.badgeRow}>
              <StampBadge label={selectedNode.category} type={selectedNode.category as any} />
              <StampBadge
                label={`☍ ${selectedNode.connections} LINKS`}
                tone={selectedNode.connections > 2 ? 'brass' : 'neutral'}
              />
            </View>
            <Pressable
              onPress={() => setSelectedNodeId(null)}
              style={styles.closeInspectorBtn}
            >
              <Text style={[typography.stamp, { color: colors.inkMuted }]}>✕</Text>
            </Pressable>
          </View>

          <Text style={[typography.title, styles.inspectorTitle, { color: colors.inkBlack }]}>
            {selectedNode.title}
          </Text>

          <View style={styles.tagChipsRow}>
            {(selectedNode.tags || []).map((tag) => (
              <Text
                key={tag}
                style={[
                  typography.stampSmall,
                  styles.tagChip,
                  { borderColor: colors.inkMuted, color: colors.tertiary },
                ]}
              >
                #{tag.toUpperCase()}
              </Text>
            ))}
          </View>

          <View style={styles.inspectorActions}>
            <StampButton
              label="OPEN NOTE ▶"
              variant="primary"
              size="sm"
              onPress={() => onSelectNote(selectedNode.id)}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  controlsBar: {
    borderBottomWidth: 2,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 20,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  graphSearchInput: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    height: 32,
  },
  zoomButtonsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  zoomBtn: {
    borderWidth: 1.5,
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  scrollCanvas: {
    flex: 1,
  },
  graphCanvas: {
    position: 'relative',
  },
  edgeLine: {
    position: 'absolute',
  },
  nodeBubble: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeStamp: {
    letterSpacing: 0.5,
  },
  nodeLabel: {
    position: 'absolute',
    top: '100%',
    marginTop: 3,
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#33261C',
    textAlign: 'center',
    width: 90,
  },
  inspectorCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderWidth: 2.5,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 8,
    zIndex: 30,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  closeInspectorBtn: {
    padding: 4,
  },
  inspectorTitle: {
    fontSize: 18,
  },
  tagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
  },
  inspectorActions: {
    marginTop: 4,
  },
});
