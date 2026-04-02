import type {
  AnalysisBundle,
  AnalysisRun,
  AskExport,
  AskSession,
  AskSessionBundle,
  AskTurn,
  FeatureSuggestion,
  Finding,
  GraphEdge,
  GraphNode,
  MemorySnapshot,
  ModelSetting,
  PatchPlan,
  Repository,
} from "@/lib/contracts/domain";

import { createDemoBundle } from "../demo/data";
import { createDemoAskSessionBundle } from "../demo/council";
import { normalizeFindings } from "../findings/normalize";
import type { ExportReport, StorageAdapter, ToolExecution } from "./storage";

declare global {
  var __repocouncil_demo_bundle__: AnalysisBundle | undefined;
  var __repocouncil_demo_ask_bundles__: AskSessionBundle[] | undefined;
}

function getMutableBundle() {
  if (!global.__repocouncil_demo_bundle__) {
    global.__repocouncil_demo_bundle__ = structuredClone(createDemoBundle());
  }

  return global.__repocouncil_demo_bundle__;
}

function getMutableAskBundles() {
  if (!global.__repocouncil_demo_ask_bundles__) {
    global.__repocouncil_demo_ask_bundles__ = [structuredClone(createDemoAskSessionBundle())];
  }

  return global.__repocouncil_demo_ask_bundles__;
}

function resetAnalysisArtifacts(bundle: AnalysisBundle) {
  bundle.graph = { nodes: [], edges: [] };
  bundle.turns = [];
  bundle.findings = [];
  bundle.features = [];
  bundle.patches = [];
  bundle.snapshots = [];
  bundle.reports = [];
  bundle.tools = [];
}

export class DemoStorageAdapter implements StorageAdapter {
  async listRepositories(): Promise<Repository[]> {
    return [getMutableBundle().repository];
  }

  async createRepository(
    input: Omit<Repository, "createdAt"> & { createdAt?: string },
  ): Promise<Repository> {
    const bundle = getMutableBundle();
    bundle.repository = {
      ...bundle.repository,
      ...input,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    bundle.run.repositoryId = bundle.repository.id;
    resetAnalysisArtifacts(bundle);
    return bundle.repository;
  }

  async getRepository(repositoryId: string) {
    const bundle = getMutableBundle();
    return bundle.repository.id === repositoryId ? bundle.repository : null;
  }

  async createAnalysisRun(
    input: Omit<AnalysisRun, "startedAt"> & { startedAt?: string },
  ): Promise<AnalysisRun> {
    const bundle = getMutableBundle();
    resetAnalysisArtifacts(bundle);
    bundle.run = {
      ...bundle.run,
      ...input,
      startedAt: input.startedAt ?? new Date().toISOString(),
    };
    return bundle.run;
  }

  async updateAnalysisRun(runId: string, patch: Partial<AnalysisRun>) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return null;
    }

    bundle.run = { ...bundle.run, ...patch };
    return bundle.run;
  }

  async getAnalysisBundle(runId: string) {
    const bundle = getMutableBundle();
    return bundle.run.id === runId ? structuredClone(bundle) : null;
  }

  async listAnalysisRuns(repositoryId?: string) {
    const bundle = getMutableBundle();
    if (repositoryId && bundle.run.repositoryId !== repositoryId) {
      return [];
    }

    return [structuredClone(bundle.run)];
  }

  async saveGraph(runId: string, nodes: GraphNode[], edges: GraphEdge[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.graph = { nodes, edges };
  }

  async appendAgentTurn(runId: string, turn: AnalysisBundle["turns"][number]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.turns = [...bundle.turns.filter((item) => item.id !== turn.id), turn].sort(
      (left, right) => left.turnIndex - right.turnIndex,
    );
  }

  async saveFindings(runId: string, findings: Finding[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.findings = normalizeFindings(findings);
  }

  async saveFeatures(runId: string, features: FeatureSuggestion[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.features = features;
  }

  async savePatches(runId: string, patches: PatchPlan[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.patches = patches;
  }

  async saveSnapshots(runId: string, snapshots: MemorySnapshot[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.snapshots = snapshots;
  }

  async saveToolExecutions(runId: string, executions: ToolExecution[]) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.tools = executions;
  }

  async saveReport(runId: string, report: ExportReport) {
    const bundle = getMutableBundle();
    if (bundle.run.id !== runId) {
      return;
    }
    bundle.reports = [report, ...bundle.reports.filter((item) => item.id !== report.id)];
  }

  async listModelSettings(repositoryId?: string) {
    const bundle = getMutableBundle();
    if (repositoryId && bundle.repository.id !== repositoryId) {
      return [];
    }

    return structuredClone(bundle.modelSettings);
  }

  async upsertModelSettings(settings: ModelSetting[]) {
    const bundle = getMutableBundle();
    bundle.modelSettings = settings.map((setting, index) => ({
      ...setting,
      id: setting.id ?? `model_setting_dynamic_${index + 1}`,
    }));
    return structuredClone(bundle.modelSettings);
  }

  async listAskSessions(limit = 25) {
    return structuredClone(
      getMutableAskBundles()
        .map((bundle) => bundle.session)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, limit),
    );
  }

  async createAskSession(
    input: Omit<AskSession, "createdAt" | "updatedAt"> & {
      createdAt?: string;
      updatedAt?: string;
    },
  ) {
    const bundles = getMutableAskBundles();
    const session: AskSession = {
      ...input,
      finalAnswer: input.finalAnswer ?? "",
      canonicalSummary: input.canonicalSummary,
      metadata: input.metadata,
      createdAt: input.createdAt ?? new Date().toISOString(),
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };

    bundles.unshift({
      session,
      turns: [],
      exports: [],
    });

    return structuredClone(session);
  }

  async updateAskSession(sessionId: string, patch: Partial<AskSession>) {
    const bundle = getMutableAskBundles().find((item) => item.session.id === sessionId);
    if (!bundle) {
      return null;
    }

    bundle.session = {
      ...bundle.session,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    return structuredClone(bundle.session);
  }

  async getAskSessionBundle(sessionId: string) {
    const bundle = getMutableAskBundles().find((item) => item.session.id === sessionId);
    return bundle ? structuredClone(bundle) : null;
  }

  async appendAskTurn(sessionId: string, turn: AskTurn) {
    const bundle = getMutableAskBundles().find((item) => item.session.id === sessionId);
    if (!bundle) {
      return;
    }

    bundle.turns = [
      ...bundle.turns.filter((item) => item.turnIndex !== turn.turnIndex),
      turn,
    ].sort((left, right) => left.turnIndex - right.turnIndex);
    bundle.session.updatedAt = new Date().toISOString();
  }

  async saveAskExport(sessionId: string, artifact: AskExport) {
    const bundle = getMutableAskBundles().find((item) => item.session.id === sessionId);
    if (!bundle) {
      return;
    }

    bundle.exports = [
      artifact,
      ...bundle.exports.filter((item) => item.id !== artifact.id),
    ];
    bundle.session.updatedAt = new Date().toISOString();
  }
}
