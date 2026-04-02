import { randomUUID } from "crypto";

import { type AnalysisBundle, type Finding } from "@/lib/contracts/domain";
import { createEmptyCanonicalState } from "@/server/agents/run-agent";
import { getDefaultModelSettings } from "@/server/models/defaults";
import { runtimeCapabilities } from "@/env";

import { runAnalyzerSuite } from "../analyzers";
import { getStorageAdapter } from "../db";
import { normalizeFindings } from "../findings/normalize";
import { buildPatchPlans } from "../patches/planner";
import { buildMarkdownReport } from "../report/export";
import { type ToolExecution } from "../db/storage";
import {
  DEBATE_AGENT_ORDER,
  continueDebateWorkflow,
  extractFeatureArtifacts,
  extractFindingArtifacts,
  hydrateWorkingState,
} from "./graph";
import {
  acquireAnalysisSlot,
  releaseAnalysisSlot,
} from "./analysis-capacity";
import { emitProgressEvent } from "./progress-bus";

export async function startAnalysisForRepository(params: {
  repository: AnalysisBundle["repository"];
  workspacePath: string;
  mode?: "full" | "demo";
}) {
  const storage = getStorageAdapter();
  const runId = randomUUID();
  acquireAnalysisSlot(runId);

  try {
    const run = await storage.createAnalysisRun({
      id: runId,
      repositoryId: params.repository.id,
      status: "pending",
      completedAt: null,
      summary: {
        activeRunsLimit: runtimeCapabilities.analysisMaxConcurrency,
      },
      threadId: randomUUID(),
    });

    await storage.upsertModelSettings(getDefaultModelSettings(params.repository.id));

    void executeAnalysis({
      repository: params.repository,
      run,
      workspacePath: params.workspacePath,
    });

    return run;
  } catch (error) {
    releaseAnalysisSlot(runId);
    throw error;
  }
}

export async function resumeAnalysisRun(runId: string) {
  const storage = getStorageAdapter();
  const bundle = await storage.getAnalysisBundle(runId);

  if (!bundle) {
    return null;
  }

  if (bundle.run.status === "running") {
    return bundle;
  }

  if (bundle.turns.some((turn) => turn.agentName === "judge") && bundle.run.status === "completed") {
    return bundle;
  }

  const workspacePath = String(bundle.repository.metadata.workspacePath ?? "");
  if (!workspacePath) {
    throw new Error("Repository workspace path is missing; cannot resume analysis.");
  }

  acquireAnalysisSlot(runId);

  const runningRun =
    (await storage.updateAnalysisRun(runId, {
      ...bundle.run,
      status: "running",
      completedAt: null,
    })) ?? {
      ...bundle.run,
      status: "running" as const,
      completedAt: null,
    };

  void executeResumedAnalysis({
    bundle: {
      ...bundle,
      run: runningRun,
    },
    workspacePath,
  });

  return {
    ...bundle,
    run: runningRun,
  };
}

function buildToolExecutions(
  runId: string,
  workspacePath: string,
  analyzerSuite: Awaited<ReturnType<typeof runAnalyzerSuite>>,
) {
  return [
    {
      id: `tool_exec_${runId}_1`,
      analysisRunId: runId,
      toolName: "framework-detector",
      input: { workspacePath },
      output: analyzerSuite.framework,
      status: "completed",
      findingIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `tool_exec_${runId}_2`,
      analysisRunId: runId,
      toolName: "file-crawler",
      input: { workspacePath },
      output: analyzerSuite.fileTree,
      status: "completed",
      findingIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `tool_exec_${runId}_3`,
      analysisRunId: runId,
      toolName: "route-extractor",
      input: { workspacePath },
      output: analyzerSuite.routes,
      status: "completed",
      findingIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: `tool_exec_${runId}_4`,
      analysisRunId: runId,
      toolName: "semgrep",
      input: { workspacePath },
      output: analyzerSuite.semgrep,
      status: "completed",
      findingIds: [],
      createdAt: new Date().toISOString(),
    },
  ] satisfies ToolExecution[];
}

async function persistAnalyzerOutputs(params: {
  repository: AnalysisBundle["repository"];
  run: AnalysisBundle["run"];
  workspacePath: string;
}) {
  const storage = getStorageAdapter();
  const analyzerSuite = await runAnalyzerSuite(params.workspacePath, params.run.id);
  const normalizedAnalyzerFindings = normalizeFindings(analyzerSuite.findings);
  const toolExecutions = buildToolExecutions(
    params.run.id,
    params.workspacePath,
    analyzerSuite,
  );

  await storage.saveGraph(params.run.id, analyzerSuite.graph.nodes, analyzerSuite.graph.edges);
  await storage.saveFindings(params.run.id, normalizedAnalyzerFindings);
  await storage.saveToolExecutions(params.run.id, toolExecutions);

  emitProgressEvent(params.run.id, {
    type: "graph.delta",
    runId: params.run.id,
    nodes: analyzerSuite.graph.nodes,
    edges: analyzerSuite.graph.edges,
  });

  return {
    analyzerSuite,
    normalizedAnalyzerFindings,
  };
}

function buildRunSummary(findings: Finding[], totalFeatures: number, totalPatches: number) {
  return {
    totalFindings: findings.length,
    totalFeatures,
    totalPatches,
    critical: findings.filter((finding) => finding.severity === "critical").length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };
}

async function finalizeAnalysis(params: {
  repository: AnalysisBundle["repository"];
  run: AnalysisBundle["run"];
  findings: Finding[];
  features: AnalysisBundle["features"];
}) {
  const storage = getStorageAdapter();
  const normalizedFeatures = params.features.map((feature, index) => ({
    ...feature,
    analysisRunId: params.run.id,
    id: `${feature.id}_${index + 1}`,
  }));
  const normalizedFindings = normalizeFindings(
    params.findings.map((finding) => ({
      ...finding,
      analysisRunId: params.run.id,
    })),
  );
  const patchPlans = buildPatchPlans(params.run.id, normalizedFindings);

  await storage.saveFindings(params.run.id, normalizedFindings);
  await storage.saveFeatures(params.run.id, normalizedFeatures);
  await storage.savePatches(params.run.id, patchPlans);

  const bundle = await storage.getAnalysisBundle(params.run.id);
  if (!bundle) {
    throw new Error("Unable to hydrate completed analysis bundle");
  }

  const report = {
    id: `report_${params.run.id}`,
    analysisRunId: params.run.id,
    title: `${params.repository.name} analysis report`,
    format: "markdown" as const,
    content: buildMarkdownReport({
      ...bundle,
      features: normalizedFeatures,
      findings: normalizedFindings,
      patches: patchPlans,
    }),
    createdAt: new Date().toISOString(),
  };
  await storage.saveReport(params.run.id, report);

  await storage.updateAnalysisRun(params.run.id, {
    ...params.run,
    status: "completed",
    completedAt: new Date().toISOString(),
    summary: buildRunSummary(
      normalizedFindings,
      normalizedFeatures.length,
      patchPlans.length,
    ),
  });

  const completedBundle = await storage.getAnalysisBundle(params.run.id);
  if (!completedBundle) {
    throw new Error("Unable to hydrate completed analysis bundle after final persistence");
  }

  emitProgressEvent(params.run.id, {
    type: "analysis.completed",
    runId: params.run.id,
    bundle: completedBundle,
  });

  return completedBundle;
}

async function executeAnalysis(params: {
  repository: AnalysisBundle["repository"];
  run: AnalysisBundle["run"];
  workspacePath: string;
}) {
  const storage = getStorageAdapter();

  try {
    await storage.updateAnalysisRun(params.run.id, {
      ...params.run,
      status: "running",
    });
    emitProgressEvent(params.run.id, {
      type: "analysis.started",
      runId: params.run.id,
      repositoryId: params.repository.id,
    });
    emitProgressEvent(params.run.id, {
      type: "analysis.progress",
      runId: params.run.id,
      message: "Running repository analyzers",
      percent: 12,
    });

    const { analyzerSuite, normalizedAnalyzerFindings } = await persistAnalyzerOutputs(params);
    emitProgressEvent(params.run.id, {
      type: "analysis.progress",
      runId: params.run.id,
      message: "Running multi-agent debate",
      percent: 45,
    });

    const workflow = await continueDebateWorkflow({
      repository: params.repository,
      run: params.run,
      analyzerSuite,
      workingState: createEmptyCanonicalState(),
      turns: [],
      findings: normalizedAnalyzerFindings,
      features: [],
      patches: [],
      snapshots: [],
    });
    await finalizeAnalysis({
      repository: params.repository,
      run: params.run,
      findings: workflow.findings,
      features: workflow.features,
    });
  } catch (error) {
    await storage.updateAnalysisRun(params.run.id, {
      ...params.run,
      status: "failed",
      completedAt: new Date().toISOString(),
      summary: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    emitProgressEvent(params.run.id, {
      type: "analysis.failed",
      runId: params.run.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    releaseAnalysisSlot(params.run.id);
  }
}

async function executeResumedAnalysis(params: {
  bundle: AnalysisBundle;
  workspacePath: string;
}) {
  const storage = getStorageAdapter();

  try {
    emitProgressEvent(params.bundle.run.id, {
      type: "analysis.progress",
      runId: params.bundle.run.id,
      message: "Refreshing analyzers before debate resume",
      percent: 18,
    });

    const { analyzerSuite, normalizedAnalyzerFindings } = await persistAnalyzerOutputs({
      repository: params.bundle.repository,
      run: params.bundle.run,
      workspacePath: params.workspacePath,
    });

    const completedAgents = new Set(params.bundle.turns.map((turn) => turn.agentName));
    const nextAgent = DEBATE_AGENT_ORDER.find((agentName) => !completedAgents.has(agentName));
    const resumedFindingArtifacts = extractFindingArtifacts(params.bundle.turns);
    const resumedFeatureArtifacts =
      params.bundle.features.length > 0
        ? params.bundle.features
        : extractFeatureArtifacts(params.bundle.turns);
    const mergedFindings = normalizeFindings([
      ...params.bundle.findings,
      ...normalizedAnalyzerFindings,
      ...resumedFindingArtifacts,
    ]);

    if (!nextAgent) {
      await finalizeAnalysis({
        repository: params.bundle.repository,
        run: params.bundle.run,
        findings: mergedFindings,
        features: resumedFeatureArtifacts,
      });
      return;
    }

    emitProgressEvent(params.bundle.run.id, {
      type: "analysis.progress",
      runId: params.bundle.run.id,
      message: `Resuming debate from ${nextAgent}`,
      percent: 56,
    });

    const workflow = await continueDebateWorkflow(
      {
        repository: params.bundle.repository,
        run: params.bundle.run,
        analyzerSuite,
        workingState: hydrateWorkingState(params.bundle),
        turns: params.bundle.turns,
        findings: mergedFindings,
        features: resumedFeatureArtifacts,
        patches: params.bundle.patches,
        snapshots: params.bundle.snapshots,
      },
      {
        startAgent: nextAgent,
        resumeSourceSnapshotId: params.bundle.snapshots.at(-1)?.id,
        resumedFromTurnCount: params.bundle.turns.length,
      },
    );

    await finalizeAnalysis({
      repository: params.bundle.repository,
      run: params.bundle.run,
      findings: workflow.findings,
      features: workflow.features,
    });
  } catch (error) {
    await storage.updateAnalysisRun(params.bundle.run.id, {
      ...params.bundle.run,
      status: "failed",
      completedAt: new Date().toISOString(),
      summary: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    emitProgressEvent(params.bundle.run.id, {
      type: "analysis.failed",
      runId: params.bundle.run.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    releaseAnalysisSlot(params.bundle.run.id);
  }
}
