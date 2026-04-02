import type { Finding, GraphEdge, GraphNode } from "@/lib/contracts/domain";

import { fileTreeAnalyzer } from "./file-tree";
import { frameworkDetector } from "./framework-detector";
import { importGraphAnalyzer } from "./import-graph";
import { packageAuditAnalyzer } from "./package-audit";
import { routeExtractor } from "./route-extractor";
import { semgrepAnalyzer } from "./semgrep";
import { testPresenceAnalyzer } from "./test-presence";
import { todoFinder } from "./todo-finder";

export async function runAnalyzerSuite(workspacePath: string, analysisRunId: string) {
  const fileTree = await fileTreeAnalyzer.execute({ workspacePath });
  const framework = await frameworkDetector.execute({ workspacePath });
  const importGraph = await importGraphAnalyzer.execute({
    workspacePath,
    files: fileTree.files,
    analysisRunId,
  });
  const routes = await routeExtractor.execute({
    workspacePath,
    files: fileTree.files,
    analysisRunId,
  });
  const todos = await todoFinder.execute({
    workspacePath,
    files: fileTree.files,
    analysisRunId,
  });
  const testPresence = await testPresenceAnalyzer.execute({
    files: fileTree.files,
    targets: routes.routes.map((route) => route.filePath),
  });
  const packageAudit = await packageAuditAnalyzer.execute({ workspacePath });
  const semgrep = await semgrepAnalyzer.execute({ workspacePath });

  const nodes = dedupeNodes([...importGraph.nodes, ...routes.nodes]);
  const edges = dedupeEdges([...importGraph.edges, ...routes.edges]);
  const findings = dedupeFindings([
    ...todos.findings,
    ...packageAudit.advisories.map((advisory, index) => ({
      id: `package_audit_${analysisRunId}_${index}`,
      analysisRunId,
      category: "security" as const,
      severity: "medium" as const,
      confidence: 0.62,
      title: `Dependency review recommended for ${advisory.package}`,
      description: advisory.note,
      filePath: "package.json",
      symbol: advisory.package,
      lineStart: undefined,
      lineEnd: undefined,
      impactedAreas: ["infra"] as const,
      evidence: [
        {
          toolName: "package-audit",
          filePath: "package.json",
          note: advisory.note,
        },
      ],
      status: "open" as const,
      sourceAgent: "security" as const,
    })),
    ...testPresence.coverage
      .filter((entry) => entry.matchingTests.length === 0)
      .map((entry, index) => ({
        id: `test_presence_${analysisRunId}_${index}`,
        analysisRunId,
        category: "implementation" as const,
        severity: "medium" as const,
        confidence: 0.76,
        title: `No tests found for ${entry.target}`,
        description: "The analyzer did not find matching tests for a high-value route module.",
        filePath: entry.target,
        symbol: undefined,
        lineStart: undefined,
        lineEnd: undefined,
        impactedAreas: ["tests"] as const,
        evidence: [
          {
            toolName: "test-presence",
            filePath: entry.target,
            note: "No matching tests found",
          },
        ],
        status: "open" as const,
        sourceAgent: "implementation" as const,
      })),
  ]);

  return {
    framework,
    fileTree,
    importGraph,
    routes,
    todos,
    testPresence,
    packageAudit,
    semgrep,
    graph: { nodes, edges },
    findings,
  };
}

export type AnalyzerSuiteResult = Awaited<ReturnType<typeof runAnalyzerSuite>>;

function dedupeNodes(nodes: GraphNode[]) {
  return Array.from(new Map(nodes.map((node) => [node.nodeKey, node])).values());
}

function dedupeEdges(edges: GraphEdge[]) {
  return Array.from(new Map(edges.map((edge) => [edge.edgeKey, edge])).values());
}

function dedupeFindings(findings: Finding[]) {
  return Array.from(new Map(findings.map((finding) => [finding.id, finding])).values());
}
