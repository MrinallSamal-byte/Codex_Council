"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AnalysisBundle } from "@/lib/contracts/domain";
import type { GraphViewNode } from "@/lib/graph-view";

const severityColor = {
  critical: "#f43f5e",
  high: "#fb923c",
  medium: "#fbbf24",
  low: "#84cc16",
  info: "#38bdf8",
} as const;

export function ArchitectureGraph({
  nodes: graphNodes,
  edges: graphEdges,
  selectedNodeKey,
  onSelectNode,
}: {
  nodes: GraphViewNode[];
  edges: AnalysisBundle["graph"]["edges"];
  selectedNodeKey?: string;
  onSelectNode?: (nodeKey: string) => void;
}) {
  const nodes = useMemo<Node[]>(
    () =>
      graphNodes.map((node) => ({
        id: node.nodeKey,
        position: node.position,
        data: {
          label: node.label,
          filePath: node.filePath,
          type: node.type,
        },
        style: {
          background: node.hotspotSeverity
            ? `${severityColor[node.hotspotSeverity]}15`
            : "rgba(15,23,42,0.85)",
          color: "#e2e8f0",
          border: `1px solid ${
            selectedNodeKey === node.nodeKey
              ? "rgba(34,211,238,0.8)"
              : node.hotspotSeverity
                ? `${severityColor[node.hotspotSeverity]}55`
                : "rgba(255,255,255,0.08)"
          }`,
          borderRadius: 18,
          padding: 12,
          width: 220,
          boxShadow: "0 10px 40px rgba(15,23,42,0.25)",
        },
      })),
    [graphNodes, selectedNodeKey],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graphEdges.map((edge) => ({
        id: edge.edgeKey,
        source: edge.sourceNodeKey,
        target: edge.targetNodeKey,
        label: edge.label ?? edge.kind,
        style: { stroke: "#334155", strokeWidth: 1.5 },
        labelStyle: { fill: "#94a3b8", fontSize: 11 },
      })),
    [graphEdges],
  );

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onSelectNode?.(node.id)}
      >
        <MiniMap
          pannable
          zoomable
          style={{ background: "#020617", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <Controls />
        <Background color="#1e293b" gap={16} />
      </ReactFlow>
    </div>
  );
}
