import type { AnalysisBundle } from "./contracts/domain";

export type GraphViewNode = AnalysisBundle["graph"]["nodes"][number] & {
  relatedFindings: AnalysisBundle["findings"];
  inboundEdges: AnalysisBundle["graph"]["edges"];
  outboundEdges: AnalysisBundle["graph"]["edges"];
  hotspotSeverity: AnalysisBundle["findings"][number]["severity"] | null;
};

export type GraphViewModel = {
  nodes: GraphViewNode[];
  edges: AnalysisBundle["graph"]["edges"];
  mermaid: string;
};

export function buildGraphViewModel(bundle: Pick<AnalysisBundle, "graph" | "findings">) {
  const nodes: GraphViewNode[] = bundle.graph.nodes.map((node) => {
    const relatedFindings = bundle.findings.filter((finding) => finding.filePath === node.filePath);
    const inboundEdges = bundle.graph.edges.filter((edge) => edge.targetNodeKey === node.nodeKey);
    const outboundEdges = bundle.graph.edges.filter((edge) => edge.sourceNodeKey === node.nodeKey);

    return {
      ...node,
      relatedFindings,
      inboundEdges,
      outboundEdges,
      hotspotSeverity: relatedFindings[0]?.severity ?? null,
    };
  });

  return {
    nodes,
    edges: bundle.graph.edges,
    mermaid: buildMermaidGraph(bundle.graph),
  } satisfies GraphViewModel;
}

export function buildMermaidGraph(graph: AnalysisBundle["graph"]) {
  const lines = ["graph TD"];

  for (const node of graph.nodes) {
    lines.push(`  ${sanitize(node.nodeKey)}["${escapeLabel(node.label)}"]`);
  }

  for (const edge of graph.edges) {
    lines.push(
      `  ${sanitize(edge.sourceNodeKey)} -->|${escapeLabel(edge.label ?? edge.kind)}| ${sanitize(
        edge.targetNodeKey,
      )}`,
    );
  }

  return lines.join("\n");
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(value: string) {
  return value.replace(/"/g, '\\"');
}
