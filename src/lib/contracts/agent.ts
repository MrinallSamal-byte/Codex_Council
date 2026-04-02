import { z } from "zod";

import {
  EvidenceRefSchema,
  FeatureSuggestionSchema,
  FindingSchema,
  WorkingMemorySchema,
} from "./domain";

const HotspotSchema = z.object({
  module: z.string(),
  rationale: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
});

export const ScoutAgentOutputSchema = z.object({
  repoSummary: z.string(),
  frameworks: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  hotspots: z.array(HotspotSchema).default([]),
  nextTools: z.array(z.string()).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const ArchitectAgentOutputSchema = z.object({
  architectureSummary: z.string(),
  dependencyFlows: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  hypotheses: z.array(z.string()).default([]),
  blindSpots: z.array(z.string()).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const SecurityAgentOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema).default([]),
  critiques: z.array(z.string()).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const ImplementationAgentOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema).default([]),
  incompleteAreas: z.array(z.string()).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const ProductAgentOutputSchema = z.object({
  summary: z.string(),
  features: z.array(FeatureSuggestionSchema).length(5),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const JudgeAgentOutputSchema = z.object({
  summary: z.string(),
  urgentFixes: z.array(z.string()).default([]),
  incompleteAreas: z.array(z.string()).default([]),
  structuralRefactors: z.array(z.string()).default([]),
  phasedRoadmap: z
    .array(
      z.object({
        phase: z.string(),
        goals: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1),
  openQuestions: z.array(z.string()).default([]),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const CanonicalDebateStateSchema = z.object({
  workingMemory: WorkingMemorySchema,
  latestScout: ScoutAgentOutputSchema.nullable().default(null),
  latestArchitect: ArchitectAgentOutputSchema.nullable().default(null),
  latestSecurity: SecurityAgentOutputSchema.nullable().default(null),
  latestImplementation: ImplementationAgentOutputSchema.nullable().default(null),
  latestProduct: ProductAgentOutputSchema.nullable().default(null),
  latestJudge: JudgeAgentOutputSchema.nullable().default(null),
});

export type ScoutAgentOutput = z.infer<typeof ScoutAgentOutputSchema>;
export type ArchitectAgentOutput = z.infer<typeof ArchitectAgentOutputSchema>;
export type SecurityAgentOutput = z.infer<typeof SecurityAgentOutputSchema>;
export type ImplementationAgentOutput = z.infer<typeof ImplementationAgentOutputSchema>;
export type ProductAgentOutput = z.infer<typeof ProductAgentOutputSchema>;
export type JudgeAgentOutput = z.infer<typeof JudgeAgentOutputSchema>;
export type CanonicalDebateState = z.infer<typeof CanonicalDebateStateSchema>;
