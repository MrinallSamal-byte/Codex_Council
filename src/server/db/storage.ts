import { z } from "zod";

import type {
  AnalysisBundle,
  AnalysisRun,
  AskExport as DomainAskExport,
  AskSession,
  AskSessionBundle,
  AskTurn,
  ExportReportSchema,
  FeatureSuggestion,
  Finding,
  GraphEdge,
  GraphNode,
  MemorySnapshot,
  ModelSetting,
  PatchPlan,
  Repository,
  ToolExecutionSchema,
} from "@/lib/contracts/domain";

export type ToolExecution = z.infer<typeof ToolExecutionSchema>;
export type ExportReport = z.infer<typeof ExportReportSchema>;
export type AskExport = DomainAskExport;

export interface StorageAdapter {
  listRepositories(): Promise<Repository[]>;
  createRepository(input: Omit<Repository, "createdAt"> & { createdAt?: string }): Promise<Repository>;
  getRepository(repositoryId: string): Promise<Repository | null>;
  createAnalysisRun(input: Omit<AnalysisRun, "startedAt"> & { startedAt?: string }): Promise<AnalysisRun>;
  updateAnalysisRun(
    runId: string,
    patch: Partial<AnalysisRun>,
  ): Promise<AnalysisRun | null>;
  getAnalysisBundle(runId: string): Promise<AnalysisBundle | null>;
  listAnalysisRuns(repositoryId?: string): Promise<AnalysisRun[]>;
  saveGraph(runId: string, nodes: GraphNode[], edges: GraphEdge[]): Promise<void>;
  appendAgentTurn(runId: string, turn: AnalysisBundle["turns"][number]): Promise<void>;
  saveFindings(runId: string, findings: Finding[]): Promise<void>;
  saveFeatures(runId: string, features: FeatureSuggestion[]): Promise<void>;
  savePatches(runId: string, patches: PatchPlan[]): Promise<void>;
  saveSnapshots(runId: string, snapshots: MemorySnapshot[]): Promise<void>;
  saveToolExecutions(runId: string, executions: ToolExecution[]): Promise<void>;
  saveReport(runId: string, report: ExportReport): Promise<void>;
  listModelSettings(repositoryId?: string): Promise<ModelSetting[]>;
  upsertModelSettings(settings: ModelSetting[]): Promise<ModelSetting[]>;
  listAskSessions(limit?: number): Promise<AskSession[]>;
  createAskSession(
    input: Omit<AskSession, "createdAt" | "updatedAt"> & {
      createdAt?: string;
      updatedAt?: string;
    },
  ): Promise<AskSession>;
  updateAskSession(sessionId: string, patch: Partial<AskSession>): Promise<AskSession | null>;
  getAskSessionBundle(sessionId: string): Promise<AskSessionBundle | null>;
  appendAskTurn(sessionId: string, turn: AskTurn): Promise<void>;
  saveAskExport(sessionId: string, artifact: AskExport): Promise<void>;
}

export function enumToPrisma(value: string) {
  return value.toUpperCase();
}

export function enumFromPrisma<T extends string>(value: string) {
  return value.toLowerCase() as T;
}
