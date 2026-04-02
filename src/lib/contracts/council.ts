import { z } from "zod";

export const CouncilTurnOutputSchema = z.object({
  summary: z.string(),
  answer: z.string(),
  keyPoints: z.array(z.string()).default([]),
  critiques: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  minorityView: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const CouncilJudgeOutputSchema = CouncilTurnOutputSchema.extend({
  keySupportingViewpoints: z.array(z.string()).default([]),
  disagreements: z.array(z.string()).default([]),
  actionPlan: z.array(z.string()).default([]),
});

export type CouncilTurnOutput = z.infer<typeof CouncilTurnOutputSchema>;
export type CouncilJudgeOutput = z.infer<typeof CouncilJudgeOutputSchema>;
