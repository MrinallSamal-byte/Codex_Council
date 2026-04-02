import { END, START, StateGraph } from "@langchain/langgraph";

import type { CanonicalDebateState } from "@/lib/contracts/agent";
import type {
  AnalysisBundle,
  AgentName,
  Finding,
  MemorySnapshot,
} from "@/lib/contracts/domain";

import { createEmptyCanonicalState } from "../agents/run-agent";
import { runAgentTurn } from "../agents/run-agent";
import { getStorageAdapter } from "../db";
import { normalizeFindings } from "../findings/normalize";
import { emitProgressEvent } from "./progress-bus";
import { AnalysisStateAnnotation } from "./state";

type WorkflowState = typeof AnalysisStateAnnotation.State;
type ExecuteAgentNodeOptions = {
  resumeSourceSnapshotId?: string;
  resumedFromTurnCount?: number;
};

export const DEBATE_AGENT_ORDER: AgentName[] = [
  "scout",
  "architect",
  "security",
  "implementation",
  "product",
  "judge",
];

function updateWorkingMemory(
  state: CanonicalDebateState,
  patch: Partial<CanonicalDebateState["workingMemory"]>,
): CanonicalDebateState {
  return {
    ...state,
    workingMemory: {
      ...state.workingMemory,
      ...patch,
    },
  };
}

function buildFindingsByCategory(findings: Finding[]) {
  return findings.reduce<Record<string, string[]>>((accumulator, finding) => {
    accumulator[finding.category] ??= [];
    accumulator[finding.category].push(finding.id);
    return accumulator;
  }, {});
}

export function hydrateWorkingState(
  bundle: Pick<AnalysisBundle, "turns" | "snapshots">,
): CanonicalDebateState {
  const workingState = createEmptyCanonicalState();
  const latestSnapshot = bundle.snapshots.at(-1);

  if (latestSnapshot) {
    workingState.workingMemory = latestSnapshot.canonicalState;
  }

  for (const turn of [...bundle.turns].sort((left, right) => left.turnIndex - right.turnIndex)) {
    if (turn.agentName === "scout") {
      workingState.latestScout = turn.outputJson as never;
    }
    if (turn.agentName === "architect") {
      workingState.latestArchitect = turn.outputJson as never;
    }
    if (turn.agentName === "security") {
      workingState.latestSecurity = turn.outputJson as never;
    }
    if (turn.agentName === "implementation") {
      workingState.latestImplementation = turn.outputJson as never;
    }
    if (turn.agentName === "product") {
      workingState.latestProduct = turn.outputJson as never;
    }
    if (turn.agentName === "judge") {
      workingState.latestJudge = turn.outputJson as never;
    }
  }

  return workingState;
}

export function extractFindingArtifacts(
  turns: Pick<AnalysisBundle, "turns">["turns"],
) {
  return normalizeFindings(
    turns.flatMap((turn) => {
      if (turn.agentName !== "security" && turn.agentName !== "implementation") {
        return [];
      }

      return ((turn.outputJson as { findings?: Finding[] }).findings ?? []) as Finding[];
    }),
  );
}

export function extractFeatureArtifacts(
  turns: Pick<AnalysisBundle, "turns">["turns"],
) {
  const latestProductTurn = [...turns]
    .sort((left, right) => right.turnIndex - left.turnIndex)
    .find((turn) => turn.agentName === "product");

  return (((latestProductTurn?.outputJson as { features?: AnalysisBundle["features"] })
    ?.features ?? []) as AnalysisBundle["features"]);
}

export async function executeAgentNode(
  workflow: WorkflowState,
  agentName: AgentName,
  turnIndex: number,
  options: ExecuteAgentNodeOptions = {},
) {
  const storage = getStorageAdapter();
  const modelSetting =
    (await storage.listModelSettings(workflow.repository.id)).find(
      (setting) => setting.agentName === agentName,
    ) ?? {
      repositoryId: workflow.repository.id,
      agentName,
      provider: "openrouter",
      model: "qwen/qwen3.6-plus:free",
      temperature: 0.2,
      fallbackModels: ["openrouter/free"],
    };

  const result = await runAgentTurn({
    agentName,
    repository: workflow.repository,
    run: workflow.run,
    analyzerSuite: workflow.analyzerSuite as never,
    workingMemory: workflow.workingState.workingMemory,
    modelSetting,
  });

  const turn = {
    id: `turn_${agentName}_${turnIndex}_${workflow.run.id}`,
    analysisRunId: workflow.run.id,
    agentName,
    model: result.model,
    provider: result.provider,
    turnIndex,
    inputSummary: `Agent ${agentName} consumed the latest analyzer bundle and canonical memory state.`,
    outputJson: result.output as Record<string, unknown>,
    evidenceRefs:
      ((result.output as { evidence?: AnalysisBundle["turns"][number]["evidenceRefs"] }).evidence ??
        []) as AnalysisBundle["turns"][number]["evidenceRefs"],
    metadata: {
      attempts: result.attempts,
      fallbackUsed:
        result.model !== modelSetting.model ||
        result.attempts.some((attempt) => attempt.status === "failed" || attempt.status === "skipped"),
      heuristicFallback: result.attempts.some(
        (attempt) => attempt.status === "heuristic_fallback",
      ),
      resumeSourceSnapshotId: options.resumeSourceSnapshotId,
      resumedFromTurnCount: options.resumedFromTurnCount,
    },
    createdAt: new Date().toISOString(),
  } satisfies AnalysisBundle["turns"][number];

  await storage.appendAgentTurn(workflow.run.id, turn);
  emitProgressEvent(workflow.run.id, {
    type: "agent.turn",
    runId: workflow.run.id,
    agentName,
    turnId: turn.id,
  });

  const nextState = structuredClone(workflow.workingState);
  if (agentName === "scout") {
    nextState.latestScout = result.output as never;
    nextState.workingMemory = {
      ...nextState.workingMemory,
      repoSummary: String((result.output as { repoSummary?: string }).repoSummary ?? ""),
      nextRecommendedTools: (result.output as { nextTools?: string[] }).nextTools ?? [],
    };
  }
  if (agentName === "architect") {
    nextState.latestArchitect = result.output as never;
    nextState.workingMemory = updateWorkingMemory(nextState, {
      architectureSummary: String(
        (result.output as { architectureSummary?: string }).architectureSummary ?? "",
      ),
      unresolvedEvidenceGaps: (result.output as { blindSpots?: string[] }).blindSpots ?? [],
    }).workingMemory;
  }
  if (agentName === "security") {
    nextState.latestSecurity = result.output as never;
    nextState.workingMemory = updateWorkingMemory(nextState, {
      contradictions: Array.from(
        new Set([
          ...nextState.workingMemory.contradictions,
          ...((result.output as { critiques?: string[] }).critiques ?? []),
        ]),
      ),
    }).workingMemory;
  }
  if (agentName === "implementation") {
    nextState.latestImplementation = result.output as never;
  }
  if (agentName === "product") {
    nextState.latestProduct = result.output as never;
  }
  if (agentName === "judge") {
    nextState.latestJudge = result.output as never;
    nextState.workingMemory = updateWorkingMemory(nextState, {
      finalAgreedPoints: (result.output as { urgentFixes?: string[] }).urgentFixes ?? [],
      openQuestions: (result.output as { openQuestions?: string[] }).openQuestions ?? [],
    }).workingMemory;
  }

  const findings = mergeFindings(
    workflow.findings,
    [
      ...(agentName === "security"
        ? (((result.output as { findings?: Finding[] }).findings ?? []) as Finding[])
        : []),
      ...(agentName === "implementation"
        ? (((result.output as { findings?: Finding[] }).findings ?? []) as Finding[])
        : []),
    ],
  );
  nextState.workingMemory = updateWorkingMemory(nextState, {
    findingsByCategory: buildFindingsByCategory(findings),
  }).workingMemory;
  const features =
    agentName === "product"
      ? (((result.output as { features?: AnalysisBundle["features"] }).features ?? []) as AnalysisBundle["features"])
      : workflow.features;

  const snapshot: MemorySnapshot = {
    id: `snapshot_${agentName}_${turnIndex}_${workflow.run.id}`,
    analysisRunId: workflow.run.id,
    snapshotType: turnIndex >= 5 ? "compressed" : "checkpoint",
    canonicalState: nextState.workingMemory,
    summaryText: `Checkpoint after ${agentName} turn.`,
    tokenEstimate: 512 + turnIndex * 64,
    createdAt: new Date().toISOString(),
  };

  await storage.saveSnapshots(workflow.run.id, [...workflow.snapshots, snapshot]);

  return {
    workingState: nextState,
    turns: [turn],
    findings,
    features,
    snapshots: [...workflow.snapshots, snapshot],
  };
}

function mergeFindings(existing: Finding[], update: Finding[]) {
  return normalizeFindings([...existing, ...update]);
}

function crossCritiqueNode(workflow: WorkflowState) {
  const contradictions = Array.from(
    new Set([
      ...workflow.workingState.workingMemory.contradictions,
      "Product expansion should wait until Security concerns around authz and validation are resolved.",
      "Implementation gaps are influencing architecture priorities, not just user-facing roadmap items.",
    ]),
  );

  return {
    workingState: {
      ...workflow.workingState,
      workingMemory: {
        ...workflow.workingState.workingMemory,
        contradictions,
      },
    },
  };
}

export async function continueDebateWorkflow(
  workflow: WorkflowState,
  options: ExecuteAgentNodeOptions & { startAgent?: AgentName } = {},
) {
  let currentState = structuredClone(workflow);
  const startIndex = options.startAgent
    ? Math.max(DEBATE_AGENT_ORDER.indexOf(options.startAgent), 0)
    : 0;

  for (let index = startIndex; index < DEBATE_AGENT_ORDER.length; index += 1) {
    const agentName = DEBATE_AGENT_ORDER[index];
    if (agentName === "judge") {
      const crossCritique = crossCritiqueNode(currentState);
      currentState = {
        ...currentState,
        ...crossCritique,
      };
    }

    const result = await executeAgentNode(
      currentState,
      agentName,
      currentState.turns.length + 1,
      options,
    );
    currentState = {
      ...currentState,
      ...result,
      turns: [...currentState.turns, ...result.turns],
    };
  }

  return currentState;
}

export function buildDebateGraph() {
  return new StateGraph(AnalysisStateAnnotation)
    .addNode("scout", (state) => executeAgentNode(state, "scout", 1))
    .addNode("architect", (state) => executeAgentNode(state, "architect", 2))
    .addNode("security", (state) => executeAgentNode(state, "security", 3))
    .addNode("implementation", (state) => executeAgentNode(state, "implementation", 4))
    .addNode("product", (state) => executeAgentNode(state, "product", 5))
    .addNode("cross_critique", crossCritiqueNode)
    .addNode("judge", (state) => executeAgentNode(state, "judge", 6))
    .addEdge(START, "scout")
    .addEdge("scout", "architect")
    .addEdge("architect", "security")
    .addEdge("security", "implementation")
    .addEdge("implementation", "product")
    .addEdge("product", "cross_critique")
    .addEdge("cross_critique", "judge")
    .addEdge("judge", END)
    .compile();
}
