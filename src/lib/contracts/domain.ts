import { z } from "zod";

export const RepositorySourceTypeSchema = z.enum(["github", "zip_upload", "demo"]);
export const AnalysisStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "canceled",
]);
export const FindingCategorySchema = z.enum([
  "security",
  "implementation",
  "maintainability",
  "feature",
  "architecture",
]);
export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export const FindingStatusSchema = z.enum([
  "open",
  "accepted",
  "false_positive",
  "resolved",
]);
export const AgentNameSchema = z.enum([
  "scout",
  "architect",
  "security",
  "implementation",
  "product",
  "judge",
]);
export const GraphNodeTypeSchema = z.enum([
  "page",
  "route",
  "controller",
  "service",
  "model",
  "table",
  "external_api",
  "auth",
  "job",
  "config",
  "module",
]);
export const SnapshotTypeSchema = z.enum([
  "checkpoint",
  "working_summary",
  "long_term",
  "compressed",
]);
export const AskModeSchema = z.enum(["normal", "debate", "deep_council"]);
export const ModelStrategySchema = z.enum(["single", "mixed", "auto"]);
export const AnswerStyleSchema = z.enum(["concise", "balanced", "detailed"]);
export const ResponsePrioritySchema = z.enum(["speed", "balanced", "quality"]);
export const AskAgentRoleSchema = z.enum([
  "researcher",
  "skeptic",
  "strategist",
  "builder",
  "critic",
  "judge",
  "product",
  "security",
  "ux",
  "teacher",
  "devils_advocate",
  "optimizer",
]);
export const AskRoundTypeSchema = z.enum([
  "opening",
  "critique",
  "refinement",
  "judgment",
]);
export const AskTurnStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
export const AskExportFormatSchema = z.enum([
  "markdown",
  "json",
  "pdf",
  "zip",
  "transcript",
]);
export const ImpactedAreaSchema = z.enum([
  "auth",
  "routing",
  "db",
  "api",
  "ui",
  "infra",
  "tests",
  "docs",
  "services",
  "config",
]);
export const EvidenceRefSchema = z.object({
  toolName: z.string().optional(),
  findingId: z.string().optional(),
  filePath: z.string().optional(),
  symbol: z.string().optional(),
  lineStart: z.number().int().optional(),
  lineEnd: z.number().int().optional(),
  excerpt: z.string().optional(),
  nodeKey: z.string().optional(),
  edgeKey: z.string().optional(),
  note: z.string().optional(),
});

export const ModelAttemptSchema = z.object({
  model: z.string(),
  provider: z.string(),
  status: z.enum(["success", "failed", "skipped", "heuristic_fallback"]),
  error: z.string().optional(),
});

export const RepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: RepositorySourceTypeSchema,
  gitUrl: z.string().url().optional().nullable(),
  defaultBranch: z.string().optional().nullable(),
  stackDetection: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  createdAt: z.string(),
});

export const AnalysisRunSchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  status: AnalysisStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  summary: z.record(z.any()).default({}),
  threadId: z.string(),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  nodeKey: z.string(),
  type: GraphNodeTypeSchema,
  label: z.string(),
  filePath: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .default({ x: 0, y: 0 }),
  metadata: z.record(z.any()).default({}),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  edgeKey: z.string(),
  sourceNodeKey: z.string(),
  targetNodeKey: z.string(),
  label: z.string().nullable().optional(),
  kind: z.string(),
  metadata: z.record(z.any()).default({}),
});

export const FindingSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  category: FindingCategorySchema,
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  title: z.string(),
  description: z.string(),
  filePath: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  lineStart: z.number().int().nullable().optional(),
  lineEnd: z.number().int().nullable().optional(),
  impactedAreas: z.array(ImpactedAreaSchema).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
  status: FindingStatusSchema.default("open"),
  sourceAgent: AgentNameSchema,
});

export const FeatureSuggestionSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  title: z.string(),
  value: z.string(),
  rationale: z.string(),
  impactedModules: z.array(z.string()).default([]),
  effort: z.enum(["S", "M", "L"]),
  risk: z.string(),
  securityNotes: z.string(),
  dependencyImpact: z.string().default("Low"),
});

export const PatchPlanSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  findingId: z.string().nullable().optional(),
  title: z.string(),
  whyItMatters: z.string(),
  rootCause: z.string(),
  filesAffected: z.array(z.string()).default([]),
  recommendedSteps: z.array(z.string()).default([]),
  draftPatch: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["draft", "reviewed", "applied", "dismissed"]).default("draft"),
});

export const ToolExecutionSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  toolName: z.string(),
  input: z.record(z.any()).default({}),
  output: z.record(z.any()).default({}),
  status: z.string(),
  findingIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export const AgentTurnMetadataSchema = z.object({
  attempts: z.array(ModelAttemptSchema).default([]),
  fallbackUsed: z.boolean().default(false),
  heuristicFallback: z.boolean().default(false),
  resumeSourceSnapshotId: z.string().optional(),
  resumedFromTurnCount: z.number().int().optional(),
});

export const AskAgentAssignmentSchema = z.object({
  role: AskAgentRoleSchema,
  label: z.string(),
  rationale: z.string(),
  provider: z.string(),
  model: z.string(),
  fallbackModels: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const AskHistoryEntrySchema = z.object({
  question: z.string(),
  finalAnswer: z.string().default(""),
  createdAt: z.string(),
});

export const AskSessionSummarySchema = z.object({
  taskType: z.string().default("general"),
  classification: z.string().default("general"),
  contextSummary: z.string().default(""),
  keySupportingViewpoints: z.array(z.string()).default([]),
  disagreements: z.array(z.string()).default([]),
  actionPlan: z.array(z.string()).default([]),
  minorityView: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0),
  finalAnswerModel: z.string().default(""),
  finalAnswerProvider: z.string().default(""),
  assignments: z.array(AskAgentAssignmentSchema).default([]),
  history: z.array(AskHistoryEntrySchema).default([]),
});

export const AskSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  threadId: z.string(),
  status: AnalysisStatusSchema,
  question: z.string(),
  mode: AskModeSchema,
  agentCount: z.number().int().min(1).max(6),
  modelStrategy: ModelStrategySchema,
  answerStyle: AnswerStyleSchema,
  priority: ResponsePrioritySchema,
  showDebateProcess: z.boolean().default(true),
  finalAnswerOnly: z.boolean().default(false),
  webLookupAllowed: z.boolean().default(false),
  toolsAllowed: z.boolean().default(false),
  maxActiveAgents: z.number().int().min(1).max(6),
  requestedModel: z.string().nullable().optional(),
  requestedProvider: z.string().nullable().optional(),
  finalAnswer: z.string().default(""),
  canonicalSummary: AskSessionSummarySchema,
  metadata: z.record(z.any()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

export const AskTurnSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: AskAgentRoleSchema,
  roundIndex: z.number().int(),
  roundType: AskRoundTypeSchema,
  turnIndex: z.number().int(),
  status: AskTurnStatusSchema.default("completed"),
  model: z.string(),
  provider: z.string(),
  inputSummary: z.string().default(""),
  outputJson: z.record(z.any()).default({}),
  summaryText: z.string().default(""),
  metadata: AgentTurnMetadataSchema.optional(),
  createdAt: z.string(),
});

export const AskExportSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  title: z.string(),
  format: AskExportFormatSchema,
  content: z.string(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.string(),
});

export const WorkingMemorySchema = z.object({
  repoSummary: z.string().default(""),
  architectureSummary: z.string().default(""),
  findingsByCategory: z.record(z.array(z.string())).default({}),
  openQuestions: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
  unresolvedEvidenceGaps: z.array(z.string()).default([]),
  finalAgreedPoints: z.array(z.string()).default([]),
  rejectedHypotheses: z.array(z.string()).default([]),
  nextRecommendedTools: z.array(z.string()).default([]),
});

export const MemorySnapshotSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  snapshotType: SnapshotTypeSchema,
  canonicalState: WorkingMemorySchema,
  summaryText: z.string().default(""),
  tokenEstimate: z.number().int().optional(),
  createdAt: z.string(),
});

export const ModelSettingSchema = z.object({
  id: z.string().optional(),
  repositoryId: z.string().nullable().optional(),
  agentName: AgentNameSchema,
  provider: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(1).default(0.2),
  maxTokens: z.number().int().nullable().optional(),
  fallbackModels: z.array(z.string()).default([]),
});

export const ExportReportSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  title: z.string(),
  format: z.enum(["markdown", "html", "json", "csv", "mermaid", "pdf", "zip"]),
  content: z.string(),
  createdAt: z.string(),
});

export const AgentTurnSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  agentName: AgentNameSchema,
  model: z.string(),
  provider: z.string(),
  turnIndex: z.number().int(),
  inputSummary: z.string().nullable().optional(),
  outputJson: z.record(z.any()),
  evidenceRefs: z.array(EvidenceRefSchema).default([]),
  metadata: AgentTurnMetadataSchema.optional(),
  createdAt: z.string(),
});

export const AnalysisBundleSchema = z.object({
  repository: RepositorySchema,
  run: AnalysisRunSchema,
  graph: z.object({
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
  }),
  turns: z.array(AgentTurnSchema),
  findings: z.array(FindingSchema),
  features: z.array(FeatureSuggestionSchema),
  patches: z.array(PatchPlanSchema),
  snapshots: z.array(MemorySnapshotSchema),
  reports: z.array(ExportReportSchema),
  tools: z.array(ToolExecutionSchema),
  modelSettings: z.array(ModelSettingSchema),
});

export const AskSessionBundleSchema = z.object({
  session: AskSessionSchema,
  turns: z.array(AskTurnSchema),
  exports: z.array(AskExportSchema),
});

export type Repository = z.infer<typeof RepositorySchema>;
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;
export type AgentName = z.infer<typeof AgentNameSchema>;
export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type ModelAttempt = z.infer<typeof ModelAttemptSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type FeatureSuggestion = z.infer<typeof FeatureSuggestionSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type MemorySnapshot = z.infer<typeof MemorySnapshotSchema>;
export type WorkingMemory = z.infer<typeof WorkingMemorySchema>;
export type PatchPlan = z.infer<typeof PatchPlanSchema>;
export type ModelSetting = z.infer<typeof ModelSettingSchema>;
export type AgentTurn = z.infer<typeof AgentTurnSchema>;
export type AnalysisBundle = z.infer<typeof AnalysisBundleSchema>;
export type AskMode = z.infer<typeof AskModeSchema>;
export type ModelStrategy = z.infer<typeof ModelStrategySchema>;
export type AnswerStyle = z.infer<typeof AnswerStyleSchema>;
export type ResponsePriority = z.infer<typeof ResponsePrioritySchema>;
export type AskAgentRole = z.infer<typeof AskAgentRoleSchema>;
export type AskRoundType = z.infer<typeof AskRoundTypeSchema>;
export type AskTurnStatus = z.infer<typeof AskTurnStatusSchema>;
export type AskAgentAssignment = z.infer<typeof AskAgentAssignmentSchema>;
export type AskSessionSummary = z.infer<typeof AskSessionSummarySchema>;
export type AskHistoryEntry = z.infer<typeof AskHistoryEntrySchema>;
export type AskSession = z.infer<typeof AskSessionSchema>;
export type AskTurn = z.infer<typeof AskTurnSchema>;
export type AskExport = z.infer<typeof AskExportSchema>;
export type AskSessionBundle = z.infer<typeof AskSessionBundleSchema>;
