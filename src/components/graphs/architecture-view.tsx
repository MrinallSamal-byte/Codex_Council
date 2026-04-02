"use client";

import { useEffect, useMemo, useState } from "react";

import type { AnalysisBundle } from "@/lib/contracts/domain";
import { buildGraphViewModel } from "@/lib/graph-view";

import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { ArchitectureGraph } from "./architecture-graph";

export function ArchitectureView({ initialBundle }: { initialBundle: AnalysisBundle }) {
  const { bundle } = useLiveAnalysisBundle(initialBundle);
  const activeBundle = bundle ?? initialBundle;
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | undefined>(
    initialBundle.graph.nodes[0]?.nodeKey,
  );

  const graphView = useMemo(
    () => buildGraphViewModel(activeBundle),
    [activeBundle],
  );
  const selectedNode =
    graphView.nodes.find((node) => node.nodeKey === selectedNodeKey) ?? graphView.nodes[0];

  useEffect(() => {
    if (!graphView.nodes.length) {
      return;
    }

    if (!selectedNodeKey || !graphView.nodes.some((node) => node.nodeKey === selectedNodeKey)) {
      setSelectedNodeKey(graphView.nodes[0]?.nodeKey);
    }
  }, [graphView.nodes, selectedNodeKey]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_360px]">
      <ArchitectureGraph
        nodes={graphView.nodes}
        edges={graphView.edges}
        selectedNodeKey={selectedNode?.nodeKey}
        onSelectNode={setSelectedNodeKey}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Graph summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>{activeBundle.graph.nodes.length} nodes mapped across the current repository run.</p>
            <p>{activeBundle.graph.edges.length} edges express dependency and request flow.</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(graphView.nodes.map((node) => node.type))).map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hotspots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeBundle.findings.slice(0, 5).map((finding) => (
              <div key={finding.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Badge variant={finding.severity}>{finding.severity}</Badge>
                  <span className="text-xs text-slate-500">{finding.filePath ?? "Unknown"}</span>
                </div>
                <p className="text-sm text-white">{finding.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Selected node</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            {selectedNode ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedNode.type}</Badge>
                  {selectedNode.hotspotSeverity ? (
                    <Badge variant={selectedNode.hotspotSeverity}>
                      {selectedNode.hotspotSeverity}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <p className="text-base font-medium text-white">{selectedNode.label}</p>
                  <p className="text-xs text-slate-500">{selectedNode.filePath ?? "No file path"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {selectedNode.inboundEdges.length} inbound
                  </Badge>
                  <Badge variant="secondary">
                    {selectedNode.outboundEdges.length} outbound
                  </Badge>
                  <Badge variant="secondary">
                    {selectedNode.relatedFindings.length} related findings
                  </Badge>
                </div>
                <EdgeList
                  title="Inbound edges"
                  edges={selectedNode.inboundEdges.map((edge) => ({
                    id: edge.id,
                    label: `${edge.label ?? edge.kind} <- ${edge.sourceNodeKey}`,
                  }))}
                />
                <EdgeList
                  title="Outbound edges"
                  edges={selectedNode.outboundEdges.map((edge) => ({
                    id: edge.id,
                    label: `${edge.label ?? edge.kind} -> ${edge.targetNodeKey}`,
                  }))}
                />
                {selectedNode.relatedFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge variant={finding.severity}>{finding.severity}</Badge>
                      <span className="text-xs text-slate-500">{finding.category}</span>
                    </div>
                    <p className="text-sm text-white">{finding.title}</p>
                    <p className="mt-2 text-xs text-slate-400">{finding.description}</p>
                  </div>
                ))}
                {selectedNode.relatedFindings.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No findings are currently linked to this node.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">No graph nodes available yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mermaid export</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={graphView.mermaid} className="min-h-52" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
}: {
  title: string;
  edges: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      {edges.length > 0 ? (
        edges.map((edge) => (
          <div
            key={edge.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-300"
          >
            {edge.label}
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">No edges in this direction.</p>
      )}
    </div>
  );
}
