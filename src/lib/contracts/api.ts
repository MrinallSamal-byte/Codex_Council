import { z } from "zod";

import {
  AgentNameSchema,
  AnalysisBundleSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  ModelSettingSchema,
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
]);

export type ProgressEvent = z.infer<typeof ProgressEventSchema>;
