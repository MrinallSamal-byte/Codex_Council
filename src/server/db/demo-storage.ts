import type {
  AnalysisBundle,
  AnalysisRun,
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
import { normalizeFindings } from "../findings/normalize";
import type { ExportReport, StorageAdapter, ToolExecution } from "./storage";

declare global {
  var __repocouncil_demo_bundle__: AnalysisBundle | undefined;
}

function getMutableBundle() {
  if (!global.__repocouncil_demo_bundle__) {
    global.__repocouncil_demo_bundle__ = structuredClone(createDemoBundle());
  }

  return global.__repocouncil_demo_bundle__;
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
}
