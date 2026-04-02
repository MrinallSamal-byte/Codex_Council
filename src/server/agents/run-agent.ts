import {
  ArchitectAgentOutputSchema,
  CanonicalDebateStateSchema,
  ImplementationAgentOutputSchema,
  JudgeAgentOutputSchema,
  ProductAgentOutputSchema,
  ScoutAgentOutputSchema,
  SecurityAgentOutputSchema,
} from "@/lib/contracts/agent";
import type {
  AgentName,
  FeatureSuggestion,
  ModelAttempt,
  ModelSetting,
  Repository,
  WorkingMemory,
} from "@/lib/contracts/domain";
import { z } from "zod";

import type { AnalyzerSuiteResult } from "../analyzers";
import { generateStructuredOutput } from "../models/openrouter";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

const schemaByAgent = {
  scout: ScoutAgentOutputSchema,
  architect: ArchitectAgentOutputSchema,
  security: SecurityAgentOutputSchema,
  implementation: ImplementationAgentOutputSchema,
  product: ProductAgentOutputSchema,
  judge: JudgeAgentOutputSchema,
} as const;

export async function runAgentTurn(params: {
  agentName: AgentName;
  repository: Repository;
  run: { id: string; threadId: string; summary: Record<string, unknown> };
  analyzerSuite: AnalyzerSuiteResult;
  workingMemory: WorkingMemory;
  modelSetting: ModelSetting;
}) {
  const schema = schemaByAgent[params.agentName] as z.ZodSchema<unknown>;

  try {
    const result = await generateStructuredOutput({
      schema,
      systemPrompt: buildSystemPrompt(params.agentName),
      userPrompt: buildUserPrompt({
        repository: params.repository,
        run: {
          id: params.run.id,
          repositoryId: params.repository.id,
          status: "running",
          startedAt: new Date().toISOString(),
          summary: params.run.summary,
          threadId: params.run.threadId,
        },
        analyzerSummary: params.analyzerSuite,
        workingMemory: params.workingMemory,
      }),
      setting: params.modelSetting,
    });

    return result;
  } catch (error) {
    const attempts =
      error && typeof error === "object" && "attempts" in error
        ? ((error as { attempts?: ModelAttempt[] }).attempts ?? [])
        : [];

    return {
      output: buildFallbackAgentOutput(params.agentName, params.analyzerSuite, params.workingMemory),
      model: `${params.modelSetting.model} (fallback)`,
      provider: params.modelSetting.provider,
      attempts: [
        ...attempts,
        {
          model: `${params.modelSetting.model} (heuristic fallback)`,
          provider: params.modelSetting.provider,
          status: "heuristic_fallback" as const,
          error: error instanceof Error ? error.message : "Fell back to heuristic agent output.",
        },
      ],
    };
  }
}

function buildFallbackAgentOutput(
  agentName: AgentName,
  analyzerSuite: AnalyzerSuiteResult,
  workingMemory: WorkingMemory,
) {
  const securityFindings = analyzerSuite.findings.filter((finding) => finding.category === "security");
  const implementationFindings = analyzerSuite.findings.filter(
    (finding) => finding.category === "implementation",
  );

  if (agentName === "scout") {
    return ScoutAgentOutputSchema.parse({
      repoSummary: `Detected ${analyzerSuite.framework.framework} with ${analyzerSuite.graph.nodes.length} mapped graph nodes and ${analyzerSuite.findings.length} early findings.`,
      frameworks: [analyzerSuite.framework.framework, analyzerSuite.framework.language].filter(Boolean),
      modules: analyzerSuite.graph.nodes.slice(0, 6).map((node) => node.label),
      hotspots: analyzerSuite.findings.slice(0, 3).map((finding) => ({
        module: finding.filePath ?? finding.title,
        rationale: finding.title,
        severity: finding.severity,
      })),
      nextTools: ["route-extractor", "todo-finder", "test-presence"],
      evidence: analyzerSuite.findings.slice(0, 3).flatMap((finding) => finding.evidence),
    });
  }

  if (agentName === "architect") {
    return ArchitectAgentOutputSchema.parse({
      architectureSummary:
        "The repository exhibits a layered application shape with UI entry points, API handlers, and service modules connected through imports and route flows.",
      dependencyFlows: analyzerSuite.routes.routes.slice(0, 3).map((route) => ({
        from: route.filePath,
        to: route.path,
        description: `${route.method} handler discovered in the route map.`,
      })),
      hypotheses: [
        "Cross-cutting auth and validation logic is likely duplicated at route boundaries.",
        "The service layer is the best candidate for reusable contracts and test seams.",
      ],
      blindSpots: workingMemory.unresolvedEvidenceGaps,
      evidence: analyzerSuite.graph.nodes.slice(0, 4).map((node) => ({
        filePath: node.filePath ?? undefined,
        nodeKey: node.nodeKey,
      })),
    });
  }

  if (agentName === "security") {
    return SecurityAgentOutputSchema.parse({
      summary:
        securityFindings.length > 0
          ? `${securityFindings.length} security-oriented findings were surfaced from static analysis and heuristics.`
          : "No direct security findings were produced by the analyzers, but auth and validation still need manual confirmation.",
      findings: securityFindings,
      critiques: [
        "Do not prioritize net-new admin features before authorization and validation are centralized.",
      ],
      evidence: securityFindings.flatMap((finding) => finding.evidence).slice(0, 6),
    });
  }

  if (agentName === "implementation") {
    return ImplementationAgentOutputSchema.parse({
      summary:
        implementationFindings.length > 0
          ? `${implementationFindings.length} implementation gaps were identified in incomplete flows and missing tests.`
          : "Implementation analyzers did not identify TODOs or disconnected flows in the scanned subset.",
      findings: implementationFindings,
      incompleteAreas: implementationFindings.map((finding) => finding.title).slice(0, 5),
      evidence: implementationFindings.flatMap((finding) => finding.evidence).slice(0, 6),
    });
  }

  if (agentName === "product") {
    return ProductAgentOutputSchema.parse({
      summary:
        "The most valuable near-term features improve operator visibility and complete already signaled workflows without expanding the platform into a new product category.",
      features: buildHeuristicFeatures(analyzerSuite),
      evidence: analyzerSuite.graph.nodes.slice(0, 5).map((node) => ({
        filePath: node.filePath ?? undefined,
        nodeKey: node.nodeKey,
      })),
    });
  }

  return JudgeAgentOutputSchema.parse({
    summary:
      "Secure sensitive paths first, complete missing operational flows second, and only then expand the product surface area.",
    urgentFixes: analyzerSuite.findings
      .filter((finding) => ["critical", "high"].includes(finding.severity))
      .slice(0, 4)
      .map((finding) => finding.title),
    incompleteAreas: implementationFindings.map((finding) => finding.title).slice(0, 4),
    structuralRefactors: [
      "Centralize authorization and validation at service and route boundaries.",
      "Reduce service-module fan-in around high-risk payment flows.",
    ],
    phasedRoadmap: [
      { phase: "Phase 1", goals: ["Secure routes", "Backfill tests"] },
      { phase: "Phase 2", goals: ["Finish incomplete product flows"] },
      { phase: "Phase 3", goals: ["Expand reporting and operator tooling"] },
    ],
    confidence: analyzerSuite.findings.length > 0 ? 0.79 : 0.62,
    openQuestions: workingMemory.openQuestions,
    evidence: analyzerSuite.findings.flatMap((finding) => finding.evidence).slice(0, 8),
  });
}

function buildHeuristicFeatures(analyzerSuite: AnalyzerSuiteResult): FeatureSuggestion[] {
  const modules = analyzerSuite.graph.nodes.map((node) => node.label).slice(0, 6);

  return [
    {
      id: "feature_auto_1",
      analysisRunId: "pending",
      title: "Operational Alerts",
      value: "Proactively surfaces failures before support tickets accumulate.",
      rationale: "The repository already has route and service flows that can emit signal-rich health events.",
      impactedModules: modules.slice(0, 3),
      effort: "M",
      risk: "Low to moderate.",
      securityNotes: "Do not include secrets or PII in alert payloads.",
      dependencyImpact: "Requires event emission and a dashboard view.",
    },
    {
      id: "feature_auto_2",
      analysisRunId: "pending",
      title: "Saved Operator Views",
      value: "Speeds repeated admin workflows by preserving filters and sort state.",
      rationale: "The current graph shows admin-facing pages and route handlers that can support persistent operator views.",
      impactedModules: modules.slice(1, 4),
      effort: "S",
      risk: "Low.",
      securityNotes: "Persist saved views per user scope.",
      dependencyImpact: "Adds a small persistence model and settings UI.",
    },
    {
      id: "feature_auto_3",
      analysisRunId: "pending",
      title: "Audit Export",
      value: "Makes compliance and incident follow-up easier for admins.",
      rationale: "The codebase already collects enough operational information to justify structured export workflows.",
      impactedModules: modules.slice(0, 2),
      effort: "M",
      risk: "Moderate.",
      securityNotes: "Redact sensitive fields and enforce download permissions.",
      dependencyImpact: "Touches reporting and auth layers.",
    },
    {
      id: "feature_auto_4",
      analysisRunId: "pending",
      title: "Workflow Completion for Placeholder UI Actions",
      value: "Eliminates dead-end operator interactions and improves trust in the admin surface.",
      rationale: "Implementation analyzers identified user-visible gaps that are already partially designed.",
      impactedModules: modules.slice(2, 5),
      effort: "M",
      risk: "Moderate due to downstream side effects.",
      securityNotes: "Add authz and validation before activation.",
      dependencyImpact: "Completes existing route and service contracts.",
    },
    {
      id: "feature_auto_5",
      analysisRunId: "pending",
      title: "Executive Risk Overview",
      value: "Summarizes operational and security posture directly in the product dashboard.",
      rationale: "The graph and findings already expose data points suitable for a lightweight overview surface.",
      impactedModules: modules.slice(0, 4),
      effort: "S",
      risk: "Low.",
      securityNotes: "Keep summaries aggregate-only; no secret-bearing evidence in the UI.",
      dependencyImpact: "Mostly read-only aggregation work.",
    },
  ];
}

export function createEmptyCanonicalState() {
  return CanonicalDebateStateSchema.parse({
    workingMemory: {
      repoSummary: "",
      architectureSummary: "",
      findingsByCategory: {},
      openQuestions: [],
      contradictions: [],
      unresolvedEvidenceGaps: [],
      finalAgreedPoints: [],
      rejectedHypotheses: [],
      nextRecommendedTools: [],
    },
  });
}
