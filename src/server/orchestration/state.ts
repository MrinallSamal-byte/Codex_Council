import { Annotation } from "@langchain/langgraph";

import type { CanonicalDebateState } from "@/lib/contracts/agent";
import type {
  AnalysisBundle,
  FeatureSuggestion,
  Finding,
  MemorySnapshot,
  PatchPlan,
} from "@/lib/contracts/domain";

export const AnalysisStateAnnotation = Annotation.Root({
  repository: Annotation<AnalysisBundle["repository"]>(),
  run: Annotation<AnalysisBundle["run"]>(),
  workingState: Annotation<CanonicalDebateState>({
    reducer: (_, update) => update,
    default: () => ({
      workingMemory: {
        repoSummary: "",
        architectureSummary: "",
        findingsByCategory: {},
        openQuestions: [],
        contradictions: [],
        unresolvedEvidenceGaps: [],
        finalAgreedPoints: [],
        rejectedHypotheses: [],
        nextRecommendedTools: [],
      },
      latestScout: null,
      latestArchitect: null,
      latestSecurity: null,
      latestImplementation: null,
      latestProduct: null,
      latestJudge: null,
    }),
  }),
  analyzerSuite: Annotation<Record<string, unknown>>(),
  turns: Annotation<AnalysisBundle["turns"]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  findings: Annotation<Finding[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  features: Annotation<FeatureSuggestion[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  patches: Annotation<PatchPlan[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  snapshots: Annotation<MemorySnapshot[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
});
