import {
  AnalysisBundleSchema,
  type AnalysisBundle,
  type AnalysisRun,
  type FeatureSuggestion,
  type Finding,
  type GraphEdge,
  type GraphNode,
  type MemorySnapshot,
  type ModelSetting,
  type PatchPlan,
  type Repository,
} from "@/lib/contracts/domain";

import { prisma } from "./client";
import { enumFromPrisma, enumToPrisma, type ExportReport, type StorageAdapter, type ToolExecution } from "./storage";
import { normalizeFindings } from "../findings/normalize";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapRepository(record: {
  id: string;
  name: string;
  sourceType: string;
  gitUrl: string | null;
  defaultBranch: string | null;
  stackDetection: unknown;
  metadata: unknown;
  createdAt: Date;
}): Repository {
  return {
    id: record.id,
    name: record.name,
    sourceType: enumFromPrisma<Repository["sourceType"]>(record.sourceType),
    gitUrl: record.gitUrl,
    defaultBranch: record.defaultBranch,
    stackDetection: (record.stackDetection ?? {}) as Repository["stackDetection"],
    metadata: (record.metadata ?? {}) as Repository["metadata"],
    createdAt: record.createdAt.toISOString(),
  };
}

function mapRun(record: {
  id: string;
  repositoryId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  summary: unknown;
  threadId: string;
}): AnalysisRun {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    status: enumFromPrisma<AnalysisRun["status"]>(record.status),
    startedAt: record.startedAt.toISOString(),
    completedAt: toIso(record.completedAt),
    summary: (record.summary ?? {}) as AnalysisRun["summary"],
    threadId: record.threadId,
  };
}

export class PrismaStorageAdapter implements StorageAdapter {
  async listRepositories() {
    const repositories = await prisma.repository.findMany({
      orderBy: { createdAt: "desc" },
    });
    return repositories.map(mapRepository);
  }

  async createRepository(
    input: Omit<Repository, "createdAt"> & { createdAt?: string },
  ) {
    const repository = await prisma.repository.create({
      data: {
        id: input.id,
        name: input.name,
        sourceType: enumToPrisma(input.sourceType) as never,
        gitUrl: input.gitUrl ?? null,
        defaultBranch: input.defaultBranch ?? null,
        stackDetection: input.stackDetection,
        metadata: input.metadata,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      },
    });
    return mapRepository(repository);
  }

  async getRepository(repositoryId: string) {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });
    return repository ? mapRepository(repository) : null;
  }

  async createAnalysisRun(
    input: Omit<AnalysisRun, "startedAt"> & { startedAt?: string },
  ) {
    const run = await prisma.analysisRun.create({
      data: {
        id: input.id,
        repositoryId: input.repositoryId,
        status: enumToPrisma(input.status) as never,
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        summary: input.summary,
        threadId: input.threadId,
      },
    });
    return mapRun(run);
  }

  async updateAnalysisRun(runId: string, patch: Partial<AnalysisRun>) {
    const run = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: patch.status ? (enumToPrisma(patch.status) as never) : undefined,
        completedAt: patch.completedAt ? new Date(patch.completedAt) : undefined,
        summary: patch.summary,
        threadId: patch.threadId,
      },
    });
    return mapRun(run);
  }

  async listAnalysisRuns(repositoryId?: string) {
    const runs = await prisma.analysisRun.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      orderBy: { startedAt: "desc" },
    });
    return runs.map(mapRun);
  }

  async getAnalysisBundle(runId: string): Promise<AnalysisBundle | null> {
    const run = await prisma.analysisRun.findUnique({
      where: { id: runId },
      include: {
        repository: true,
        agentTurns: true,
        findings: true,
        featureSuggestions: true,
        graphNodes: true,
        graphEdges: true,
        memorySnapshots: true,
        patchPlans: true,
        exportReports: true,
        toolExecutions: true,
      },
    });

    if (!run) {
      return null;
    }

    const modelSettings = await prisma.modelSetting.findMany({
      where: {
        OR: [{ repositoryId: run.repositoryId }, { repositoryId: null }],
      },
      orderBy: { updatedAt: "desc" },
    });

    return AnalysisBundleSchema.parse({
      repository: mapRepository(run.repository),
      run: mapRun(run),
      graph: {
        nodes: run.graphNodes.map((node) => ({
          id: node.id,
          analysisRunId: node.analysisRunId,
          nodeKey: node.nodeKey,
          type: enumFromPrisma<GraphNode["type"]>(node.type),
          label: node.label,
          filePath: node.filePath,
          symbol: node.symbol,
          position: (node.position ?? { x: 0, y: 0 }) as GraphNode["position"],
          metadata: (node.metadata ?? {}) as GraphNode["metadata"],
        })),
        edges: run.graphEdges.map((edge) => ({
          id: edge.id,
          analysisRunId: edge.analysisRunId,
          edgeKey: edge.edgeKey,
          sourceNodeKey: edge.sourceNodeKey,
          targetNodeKey: edge.targetNodeKey,
          label: edge.label,
          kind: edge.kind,
          metadata: (edge.metadata ?? {}) as GraphEdge["metadata"],
        })),
      },
      turns: run.agentTurns.map((turn) => ({
        id: turn.id,
        analysisRunId: turn.analysisRunId,
        agentName: enumFromPrisma<AnalysisBundle["turns"][number]["agentName"]>(turn.agentName),
        model: turn.model,
        provider: turn.provider,
        turnIndex: turn.turnIndex,
        inputSummary: turn.inputSummary,
        outputJson: turn.outputJson as Record<string, unknown>,
        evidenceRefs: (turn.evidenceRefs ?? []) as AnalysisBundle["turns"][number]["evidenceRefs"],
        metadata:
          (turn.metadata ?? undefined) as AnalysisBundle["turns"][number]["metadata"],
        createdAt: turn.createdAt.toISOString(),
      })),
      findings: run.findings.map((finding) => ({
        id: finding.id,
        analysisRunId: finding.analysisRunId,
        category: enumFromPrisma<Finding["category"]>(finding.category),
        severity: enumFromPrisma<Finding["severity"]>(finding.severity),
        confidence: finding.confidence,
        title: finding.title,
        description: finding.description,
        filePath: finding.filePath,
        symbol: finding.symbol,
        lineStart: finding.lineStart,
        lineEnd: finding.lineEnd,
        impactedAreas: finding.impactedAreas.map((area) => enumFromPrisma<Finding["impactedAreas"][number]>(area)),
        evidence: (finding.evidenceJson ?? []) as Finding["evidence"],
        status: enumFromPrisma<Finding["status"]>(finding.status),
        sourceAgent: enumFromPrisma<Finding["sourceAgent"]>(finding.sourceAgent),
      })),
      features: run.featureSuggestions.map((feature) => ({
        id: feature.id,
        analysisRunId: feature.analysisRunId,
        title: feature.title,
        value: feature.value,
        rationale: feature.rationale,
        impactedModules: feature.impactedModules,
        effort: feature.effort as FeatureSuggestion["effort"],
        risk: feature.risk,
        securityNotes: feature.securityNotes,
        dependencyImpact: (feature.metadata as { dependencyImpact?: string } | null)?.dependencyImpact ?? "Low",
      })),
      patches: run.patchPlans.map((patch) => ({
        id: patch.id,
        analysisRunId: patch.analysisRunId,
        findingId: patch.findingId,
        title: patch.title,
        whyItMatters: patch.whyItMatters,
        rootCause: patch.rootCause,
        filesAffected: patch.filesAffected,
        recommendedSteps: (patch.recommendedSteps ?? []) as string[],
        draftPatch: patch.draftPatch,
        confidence: patch.confidence,
        status: enumFromPrisma<PatchPlan["status"]>(patch.status),
      })),
      snapshots: run.memorySnapshots.map((snapshot) => ({
        id: snapshot.id,
        analysisRunId: snapshot.analysisRunId,
        snapshotType: enumFromPrisma<MemorySnapshot["snapshotType"]>(snapshot.snapshotType),
        canonicalState: snapshot.canonicalState as MemorySnapshot["canonicalState"],
        summaryText: snapshot.summaryText ?? "",
        tokenEstimate: snapshot.tokenEstimate ?? undefined,
        createdAt: snapshot.createdAt.toISOString(),
      })),
      reports: run.exportReports.map((report) => ({
        id: report.id,
        analysisRunId: report.analysisRunId,
        title: report.title,
        format: report.format as AnalysisBundle["reports"][number]["format"],
        content: report.content,
        createdAt: report.createdAt.toISOString(),
      })),
      tools: run.toolExecutions.map((execution) => ({
        id: execution.id,
        analysisRunId: execution.analysisRunId,
        toolName: execution.toolName,
        input: execution.inputJson as Record<string, unknown>,
        output: execution.outputJson as Record<string, unknown>,
        status: execution.status,
        findingIds: execution.findingIds,
        createdAt: execution.createdAt.toISOString(),
      })),
      modelSettings: modelSettings.map((setting) => ({
        id: setting.id,
        repositoryId: setting.repositoryId,
        agentName: enumFromPrisma<ModelSetting["agentName"]>(setting.agentName),
        provider: setting.provider,
        model: setting.model,
        temperature: setting.temperature,
        maxTokens: setting.maxTokens,
        fallbackModels: (setting.fallbackModels ?? []) as string[],
      })),
    });
  }

  async saveGraph(runId: string, nodes: GraphNode[], edges: GraphEdge[]) {
    await prisma.$transaction([
      prisma.graphEdge.deleteMany({ where: { analysisRunId: runId } }),
      prisma.graphNode.deleteMany({ where: { analysisRunId: runId } }),
      prisma.graphNode.createMany({
        data: nodes.map((node) => ({
          id: node.id,
          analysisRunId: runId,
          nodeKey: node.nodeKey,
          type: enumToPrisma(node.type) as never,
          label: node.label,
          filePath: node.filePath ?? null,
          symbol: node.symbol ?? null,
          position: node.position,
          metadata: node.metadata,
        })),
      }),
      prisma.graphEdge.createMany({
        data: edges.map((edge) => ({
          id: edge.id,
          analysisRunId: runId,
          edgeKey: edge.edgeKey,
          sourceNodeKey: edge.sourceNodeKey,
          targetNodeKey: edge.targetNodeKey,
          label: edge.label ?? null,
          kind: edge.kind,
          metadata: edge.metadata,
        })),
      }),
    ]);
  }

  async appendAgentTurn(runId: string, turn: AnalysisBundle["turns"][number]) {
    await prisma.agentTurn.upsert({
      where: {
        analysisRunId_turnIndex: {
          analysisRunId: runId,
          turnIndex: turn.turnIndex,
        },
      },
      update: {
        agentName: enumToPrisma(turn.agentName) as never,
        model: turn.model,
        provider: turn.provider,
        inputSummary: turn.inputSummary ?? null,
        outputJson: turn.outputJson,
        evidenceRefs: turn.evidenceRefs,
        metadata: turn.metadata,
      },
      create: {
        id: turn.id,
        analysisRunId: runId,
        agentName: enumToPrisma(turn.agentName) as never,
        model: turn.model,
        provider: turn.provider,
        turnIndex: turn.turnIndex,
        inputSummary: turn.inputSummary ?? null,
        outputJson: turn.outputJson,
        evidenceRefs: turn.evidenceRefs,
        metadata: turn.metadata,
        createdAt: new Date(turn.createdAt),
      },
    });
  }

  async saveFindings(runId: string, findings: Finding[]) {
    const normalizedFindings = normalizeFindings(findings);
    await prisma.$transaction([
      prisma.finding.deleteMany({ where: { analysisRunId: runId } }),
      prisma.finding.createMany({
        data: normalizedFindings.map((finding) => ({
          id: finding.id,
          analysisRunId: runId,
          category: enumToPrisma(finding.category) as never,
          severity: enumToPrisma(finding.severity) as never,
          confidence: finding.confidence,
          title: finding.title,
          description: finding.description,
          filePath: finding.filePath ?? null,
          symbol: finding.symbol ?? null,
          lineStart: finding.lineStart ?? null,
          lineEnd: finding.lineEnd ?? null,
          impactedAreas: finding.impactedAreas.map(enumToPrisma),
          evidenceJson: finding.evidence,
          status: enumToPrisma(finding.status) as never,
          sourceAgent: enumToPrisma(finding.sourceAgent) as never,
        })),
      }),
    ]);
  }

  async saveFeatures(runId: string, features: FeatureSuggestion[]) {
    await prisma.$transaction([
      prisma.featureSuggestion.deleteMany({ where: { analysisRunId: runId } }),
      prisma.featureSuggestion.createMany({
        data: features.map((feature) => ({
          id: feature.id,
          analysisRunId: runId,
          title: feature.title,
          value: feature.value,
          rationale: feature.rationale,
          impactedModules: feature.impactedModules,
          effort: feature.effort,
          risk: feature.risk,
          securityNotes: feature.securityNotes,
          metadata: { dependencyImpact: feature.dependencyImpact },
        })),
      }),
    ]);
  }

  async savePatches(runId: string, patches: PatchPlan[]) {
    await prisma.$transaction([
      prisma.patchPlan.deleteMany({ where: { analysisRunId: runId } }),
      prisma.patchPlan.createMany({
        data: patches.map((patch) => ({
          id: patch.id,
          analysisRunId: runId,
          findingId: patch.findingId ?? null,
          title: patch.title,
          whyItMatters: patch.whyItMatters,
          rootCause: patch.rootCause,
          filesAffected: patch.filesAffected,
          recommendedSteps: patch.recommendedSteps,
          draftPatch: patch.draftPatch ?? null,
          confidence: patch.confidence,
          status: enumToPrisma(patch.status) as never,
        })),
      }),
    ]);
  }

  async saveSnapshots(runId: string, snapshots: MemorySnapshot[]) {
    await prisma.$transaction([
      prisma.memorySnapshot.deleteMany({ where: { analysisRunId: runId } }),
      prisma.memorySnapshot.createMany({
        data: snapshots.map((snapshot) => ({
          id: snapshot.id,
          analysisRunId: runId,
          snapshotType: enumToPrisma(snapshot.snapshotType) as never,
          canonicalState: snapshot.canonicalState,
          summaryText: snapshot.summaryText,
          tokenEstimate: snapshot.tokenEstimate ?? null,
          createdAt: new Date(snapshot.createdAt),
        })),
      }),
    ]);
  }

  async saveToolExecutions(runId: string, executions: ToolExecution[]) {
    await prisma.$transaction([
      prisma.toolExecution.deleteMany({ where: { analysisRunId: runId } }),
      prisma.toolExecution.createMany({
        data: executions.map((execution) => ({
          id: execution.id,
          analysisRunId: runId,
          toolName: execution.toolName,
          inputJson: execution.input,
          outputJson: execution.output,
          status: execution.status,
          findingIds: execution.findingIds,
          createdAt: new Date(execution.createdAt),
        })),
      }),
    ]);
  }

  async saveReport(runId: string, report: ExportReport) {
    await prisma.exportReport.upsert({
      where: { id: report.id },
      update: {
        title: report.title,
        format: report.format,
        content: report.content,
      },
      create: {
        id: report.id,
        analysisRunId: runId,
        title: report.title,
        format: report.format,
        content: report.content,
        createdAt: new Date(report.createdAt),
      },
    });
  }

  async listModelSettings(repositoryId?: string) {
    const settings = await prisma.modelSetting.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return settings.map((setting) => ({
      id: setting.id,
      repositoryId: setting.repositoryId,
      agentName: enumFromPrisma<ModelSetting["agentName"]>(setting.agentName),
      provider: setting.provider,
      model: setting.model,
      temperature: setting.temperature,
      maxTokens: setting.maxTokens,
      fallbackModels: (setting.fallbackModels ?? []) as string[],
    }));
  }

  async upsertModelSettings(settings: ModelSetting[]) {
    for (const setting of settings) {
      await prisma.modelSetting.deleteMany({
        where: {
          repositoryId: setting.repositoryId ?? null,
          agentName: enumToPrisma(setting.agentName) as never,
        },
      });
      await prisma.modelSetting.create({
        data: {
          repositoryId: setting.repositoryId ?? null,
          agentName: enumToPrisma(setting.agentName) as never,
          provider: setting.provider,
          model: setting.model,
          temperature: setting.temperature,
          maxTokens: setting.maxTokens ?? null,
          fallbackModels: setting.fallbackModels,
        },
      });
    }

    return this.listModelSettings(settings[0]?.repositoryId ?? undefined);
  }
}
