import { z } from "zod";

import {
  AnswerStyleSchema,
  AgentNameSchema,
  AnalysisBundleSchema,
  AnalysisStatusSchema,
  AskAgentAssignmentSchema,
  AskExportFormatSchema,
  AskModeSchema,
  AskSessionBundleSchema,
  AskTurnSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  ModelSettingSchema,
  ModelStrategySchema,
  ResponsePrioritySchema,
} from "./domain";

export const CreateRepoRequestSchema = z.object({
  name: z.string().min(2),
  gitUrl: z.string().url().optional(),
  sourceType: z.enum(["github", "zip_upload", "demo"]),
});

export const StartAnalysisRequestSchema = z.object({
  repositoryId: z.string(),
  mode: z.enum(["full", "demo"]).default("full"),
});

export const ImportRepoRequestSchema = z.object({
  gitUrl: z.string().url().optional(),
  useDemo: z.boolean().default(false),
});

export const UpdateModelSettingsRequestSchema = z.object({
  settings: z.array(ModelSettingSchema.omit({ id: true })),
});

export const CreateAskSessionRequestSchema = z.object({
  question: z.string().min(2),
  mode: AskModeSchema.default("normal"),
  agentCount: z.number().int().min(1).max(6).default(1),
  modelStrategy: ModelStrategySchema.default("auto"),
  answerStyle: AnswerStyleSchema.default("balanced"),
  priority: ResponsePrioritySchema.default("balanced"),
  showDebateProcess: z.boolean().default(true),
  finalAnswerOnly: z.boolean().default(false),
  webLookupAllowed: z.boolean().default(false),
  toolsAllowed: z.boolean().default(false),
  requestedModel: z.string().optional(),
  requestedProvider: z.string().optional(),
});

export const ContinueAskSessionRequestSchema = CreateAskSessionRequestSchema.partial().extend({
  question: z.string().min(2).optional(),
});

export const GetAskExportRequestSchema = z.object({
  format: AskExportFormatSchema.default("markdown"),
  download: z.boolean().default(false),
});

export const ProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("analysis.started"),
    runId: z.string(),
    repositoryId: z.string(),
  }),
  z.object({
    type: z.literal("analysis.progress"),
    runId: z.string(),
    message: z.string(),
    percent: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("graph.delta"),
    runId: z.string(),
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
  }),
  z.object({
    type: z.literal("agent.turn"),
    runId: z.string(),
    agentName: AgentNameSchema,
    turnId: z.string(),
  }),
  z.object({
    type: z.literal("analysis.completed"),
    runId: z.string(),
    bundle: AnalysisBundleSchema,
  }),
  z.object({
    type: z.literal("analysis.failed"),
    runId: z.string(),
    error: z.string(),
  }),
  z.object({
    type: z.literal("ask.started"),
    sessionId: z.string(),
    mode: AskModeSchema,
  }),
  z.object({
    type: z.literal("ask.progress"),
    sessionId: z.string(),
    message: z.string(),
    percent: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("ask.agent.assigned"),
    sessionId: z.string(),
    assignments: z.array(AskAgentAssignmentSchema),
  }),
  z.object({
    type: z.literal("ask.round.started"),
    sessionId: z.string(),
    roundIndex: z.number().int(),
    roundType: z.enum(["opening", "critique", "refinement", "judgment"]),
    roles: z.array(
      z.enum([
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
      ]),
    ),
  }),
  z.object({
    type: z.literal("ask.turn.started"),
    sessionId: z.string(),
    turn: AskTurnSchema.pick({
      id: true,
      sessionId: true,
      role: true,
      roundIndex: true,
      roundType: true,
      turnIndex: true,
      status: true,
      model: true,
      provider: true,
      inputSummary: true,
      outputJson: true,
      summaryText: true,
      createdAt: true,
    }),
  }),
  z.object({
    type: z.literal("ask.turn.completed"),
    sessionId: z.string(),
    turnId: z.string(),
    role: AskTurnSchema.shape.role,
    roundIndex: AskTurnSchema.shape.roundIndex,
    roundType: AskTurnSchema.shape.roundType,
  }),
  z.object({
    type: z.literal("ask.completed"),
    sessionId: z.string(),
    session: AskSessionBundleSchema,
  }),
  z.object({
    type: z.literal("ask.failed"),
    sessionId: z.string(),
    status: AnalysisStatusSchema,
    error: z.string(),
  }),
]);

export type ProgressEvent = z.infer<typeof ProgressEventSchema>;
