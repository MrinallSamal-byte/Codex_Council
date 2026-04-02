import { randomUUID } from "crypto";

import { runtimeCapabilities } from "@/env";
import {
  CouncilJudgeOutputSchema,
  CouncilTurnOutputSchema,
  type CouncilJudgeOutput,
  type CouncilTurnOutput,
} from "@/lib/contracts/council";
import type {
  AskAgentAssignment,
  AskAgentRole,
  AskMode,
  AskRoundType,
  AskSession,
  AskSessionBundle,
  AskTurn,
} from "@/lib/contracts/domain";
import { slugify, titleCase } from "@/lib/utils";
import { getStorageAdapter } from "@/server/db";
import { generateStructuredOutput } from "@/server/models/openrouter";
import {
  acquireAskSlot,
  releaseAskSlot,
} from "@/server/orchestration/ask-capacity";
import { emitProgressEvent } from "@/server/orchestration/progress-bus";

import {
  assignmentToModelSetting,
  buildCouncilMetadata,
  classifyCouncilQuestion,
  getCouncilAssignments,
  getCouncilRoles,
  planCouncilExecution,
  type CouncilTaskType,
} from "./defaults";
import { buildCouncilSystemPrompt, buildCouncilUserPrompt } from "./prompts";

type StartAskSessionInput = {
  question: string;
  mode: AskMode;
  agentCount: number;
  modelStrategy: AskSession["modelStrategy"];
  answerStyle: AskSession["answerStyle"];
  priority: AskSession["priority"];
  showDebateProcess: boolean;
  finalAnswerOnly: boolean;
  webLookupAllowed: boolean;
  toolsAllowed: boolean;
  requestedModel?: string | null;
  requestedProvider?: string | null;
};

const critiqueFocusedRoles = new Set<AskAgentRole>([
  "skeptic",
  "critic",
  "devils_advocate",
  "security",
]);

function buildSessionTitle(question: string) {
  const compact = question.trim().replace(/\s+/g, " ");
  return compact.length > 88 ? `${compact.slice(0, 85)}...` : compact;
}

function buildRoundPlan(mode: AskMode, roles: AskAgentRole[]) {
  const participants = roles.filter((role) => role !== "judge");
  const critiqueRoles = participants.filter((role) => critiqueFocusedRoles.has(role));

  const rounds: Array<{ roundType: AskRoundType; roles: AskAgentRole[] }> = [
    {
      roundType: "opening",
      roles: participants.length > 0 ? participants : roles,
    },
  ];

  if (roles.includes("judge")) {
    rounds.push({
      roundType: "critique",
      roles: critiqueRoles.length > 0 ? critiqueRoles : participants,
    });
  }

  if (mode === "deep_council" && participants.length > 0) {
    rounds.push({
      roundType: "refinement",
      roles: participants,
    });
  }

  if (roles.includes("judge")) {
    rounds.push({
      roundType: "judgment",
      roles: ["judge"],
    });
  }

  return rounds.filter((round) => round.roles.length > 0);
}

function getRoleHeuristicAngle(role: AskAgentRole, taskType: CouncilTaskType) {
  const generic = {
    question: "Clarify what success looks like before committing to a path.",
    risk: "List the main trade-offs and what could go wrong.",
    action: "Turn the answer into concrete next steps.",
  };

  switch (role) {
    case "builder":
      return {
        summary: "Translate the answer into practical implementation steps.",
        points: [
          "Prefer an incremental path instead of a risky all-at-once change.",
          "Make assumptions explicit before implementation starts.",
          "Define a smallest useful version first.",
        ],
      };
    case "skeptic":
    case "critic":
    case "devils_advocate":
      return {
        summary: "Challenge the most fragile assumption in the current answer.",
        points: [
          "Look for what has been overstated or left unproven.",
          "Check whether the recommended path is realistic under the stated constraints.",
          generic.risk,
        ],
      };
    case "teacher":
      return {
        summary: "Explain the core idea in a simpler, more learnable form.",
        points: [
          "Define the concept plainly.",
          "Use a short mental model or analogy if it helps.",
          generic.action,
        ],
      };
    case "security":
      return {
        summary: "Focus on trust boundaries, misuse, and downside risk.",
        points: [
          "Identify what can fail dangerously, not just what can fail functionally.",
          "Recommend guardrails alongside the main answer.",
          generic.risk,
        ],
      };
    case "product":
    case "ux":
      return {
        summary: "Anchor the answer in user value and clarity.",
        points: [
          "Favor the option that improves user outcomes fastest.",
          "Reduce complexity the user has to absorb.",
          generic.action,
        ],
      };
    case "optimizer":
      return {
        summary: "Look for leverage and simplification.",
        points: [
          "Reduce moving parts where possible.",
          "Prefer reusable decisions over bespoke one-offs.",
          generic.action,
        ],
      };
    case "judge":
      return {
        summary: "Synthesize the strongest answer and surface the real caveats.",
        points: [
          generic.question,
          generic.risk,
          generic.action,
        ],
      };
    default:
      return {
        summary: `Approach the question like a ${taskType} decision with clear reasoning.`,
        points: [
          generic.question,
          generic.risk,
          generic.action,
        ],
      };
  }
}

function buildHeuristicTurnOutput(params: {
  role: AskAgentRole;
  roundType: AskRoundType;
  question: string;
  taskType: CouncilTaskType;
  priorTurns: AskTurn[];
}) {
  const angle = getRoleHeuristicAngle(params.role, params.taskType);
  const opposingView = params.priorTurns.at(-1)?.summaryText;
  const answerPrefix =
    params.roundType === "critique"
      ? `${titleCase(params.role)} critique:`
      : params.roundType === "refinement"
        ? `${titleCase(params.role)} refinement:`
        : `${titleCase(params.role)} view:`;

  return CouncilTurnOutputSchema.parse({
    summary: angle.summary,
    answer: [
      answerPrefix,
      `For "${params.question}", prioritize clarity about goals, constraints, and trade-offs.`,
      params.roundType === "critique"
        ? `The current debate likely needs stronger attention to: ${angle.points[1].toLowerCase()}`
        : `A strong next move is to ${angle.points[2].toLowerCase()}`,
      opposingView ? `Earlier council context to account for: ${opposingView}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    keyPoints: angle.points,
    critiques:
      params.roundType === "critique"
        ? [
            "Some claims may be under-evidenced because live model execution was unavailable.",
            "The recommendation should stay proportional to the user's actual constraints.",
          ]
        : [],
    recommendations: [
      "Make the success criteria explicit before acting.",
      "Choose the lowest-complexity path that still meets the goal.",
    ],
    followUps: ["What constraint matters most: speed, certainty, or flexibility?"],
    minorityView:
      params.role === "skeptic" || params.role === "devils_advocate"
        ? "A minority view may still be right if a hidden constraint changes the trade-off."
        : undefined,
    confidence: runtimeCapabilities.hasOpenRouter ? 0.42 : 0.28,
  });
}

function buildHeuristicJudgeOutput(params: {
  question: string;
  taskType: CouncilTaskType;
  priorTurns: AskTurn[];
}) {
  const supportingViewpoints = params.priorTurns
    .map((turn) => turn.summaryText)
    .filter(Boolean)
    .slice(-4);
  const disagreements = params.priorTurns
    .flatMap((turn) => {
      const critiques = (turn.outputJson.critiques as string[] | undefined) ?? [];
      return critiques;
    })
    .slice(0, 3);

  return CouncilJudgeOutputSchema.parse({
    summary: "Best-effort synthesis generated from the available council context.",
    answer: [
      `For "${params.question}", the strongest answer is the one that matches your constraints while avoiding unnecessary complexity.`,
      `Treat this as a ${params.taskType} question: define the goal, surface the main trade-offs, and choose the simplest path that still gives you leverage.`,
    ].join(" "),
    keyPoints: [
      "State the goal before choosing a solution.",
      "Prefer the option that stays easiest to revise later.",
      "Use disagreement to find the real decision boundary, not to stall progress.",
    ],
    critiques: disagreements,
    recommendations: [
      "Decide with explicit criteria.",
      "Test the first version quickly.",
      "Revisit once new evidence appears.",
    ],
    followUps: ["If you want, rerun this with more agents or a different mode."],
    keySupportingViewpoints: supportingViewpoints,
    disagreements,
    actionPlan: [
      "Write down the top three constraints.",
      "Pick a first approach that preserves optionality.",
      "Review the result after the first concrete milestone.",
    ],
    minorityView:
      disagreements[0] ??
      "A minority view may still matter if your hidden constraints are unusual.",
    confidence: runtimeCapabilities.hasOpenRouter ? 0.5 : 0.3,
  });
}

async function runCouncilTurn(params: {
  session: AskSession;
  role: AskAgentRole;
  roundIndex: number;
  roundType: AskRoundType;
  assignment: AskAgentAssignment;
  question: string;
  taskType: CouncilTaskType;
  priorTurns: AskTurn[];
}) {
  const setting = assignmentToModelSetting(params.assignment);
  const isJudge = params.role === "judge" || params.roundType === "judgment";
  const schema = isJudge ? CouncilJudgeOutputSchema : CouncilTurnOutputSchema;

  try {
    const result = await generateStructuredOutput({
      schema,
      systemPrompt: buildCouncilSystemPrompt({
        role: params.role,
        mode: params.session.mode,
        roundType: params.roundType,
        answerStyle: params.session.answerStyle,
        priority: params.session.priority,
      }),
      userPrompt: buildCouncilUserPrompt({
        session: params.session,
        role: params.role,
        roundIndex: params.roundIndex,
        roundType: params.roundType,
        assignment: params.assignment,
        question: params.question,
        taskType: params.taskType,
        priorTurns: params.priorTurns,
      }),
      setting,
    });

    return {
      output: result.output,
      model: result.model,
      provider: result.provider,
      metadata: {
        attempts: result.attempts,
        fallbackUsed: result.attempts.length > 1,
        heuristicFallback: false,
      },
    };
  } catch (error) {
    const attempts =
      error && typeof error === "object" && "attempts" in error
        ? ((error as {
            attempts?: Array<{
              model: string;
              provider: string;
              status: "success" | "failed" | "skipped" | "heuristic_fallback";
              error?: string;
            }>;
          }).attempts ?? [])
        : [];

    return {
      output: isJudge
        ? buildHeuristicJudgeOutput({
            question: params.question,
            taskType: params.taskType,
            priorTurns: params.priorTurns,
          })
        : buildHeuristicTurnOutput({
            role: params.role,
            roundType: params.roundType,
            question: params.question,
            taskType: params.taskType,
            priorTurns: params.priorTurns,
          }),
      model: `${params.assignment.model} (fallback)`,
      provider: params.assignment.provider,
      metadata: {
        attempts: [
          ...attempts,
          {
            model: `${params.assignment.model} (heuristic fallback)`,
            provider: params.assignment.provider,
            status: "heuristic_fallback" as const,
            error: error instanceof Error ? error.message : "Council turn fell back to heuristics.",
          },
        ],
        fallbackUsed: true,
        heuristicFallback: true,
      },
    };
  }
}

async function runInBatches<T>(
  items: T[],
  maxConcurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += maxConcurrency) {
    const batch = items.slice(index, index + maxConcurrency);
    await Promise.all(batch.map((item, batchIndex) => worker(item, index + batchIndex)));
  }
}

function nextTurnIndex(bundle: AskSessionBundle | null) {
  return (bundle?.turns.at(-1)?.turnIndex ?? 0) + 1;
}

function nextRoundIndex(bundle: AskSessionBundle | null) {
  return (bundle?.turns.at(-1)?.roundIndex ?? 0) + 1;
}

function buildCanonicalSummary(params: {
  session: AskSession;
  taskType: CouncilTaskType;
  assignments: AskAgentAssignment[];
  finalTurn: AskTurn;
  newTurns: AskTurn[];
}) {
  const output = params.finalTurn.outputJson as CouncilJudgeOutput | CouncilTurnOutput;
  const priorHistory = params.session.canonicalSummary.history ?? [];

  return {
    ...params.session.canonicalSummary,
    taskType: params.taskType,
    classification: params.taskType,
    contextSummary:
      (output.summary as string | undefined) ??
      params.newTurns.map((turn) => turn.summaryText).join(" "),
    keySupportingViewpoints:
      "keySupportingViewpoints" in output
        ? output.keySupportingViewpoints
        : output.keyPoints,
    disagreements:
      "disagreements" in output ? output.disagreements : output.critiques,
    actionPlan: "actionPlan" in output ? output.actionPlan : output.recommendations,
    minorityView: output.minorityView ?? "",
    confidence: output.confidence ?? 0.5,
    finalAnswerModel: params.finalTurn.model,
    finalAnswerProvider: params.finalTurn.provider,
    assignments: params.assignments,
    history: [
      ...priorHistory,
      {
        question: params.session.question,
        finalAnswer:
          (output.answer as string | undefined) ?? params.session.finalAnswer ?? "",
        createdAt: new Date().toISOString(),
      },
    ].slice(-12),
  } satisfies AskSession["canonicalSummary"];
}

async function executeAskSession(sessionId: string) {
  const storage = getStorageAdapter();
  const bundle = await storage.getAskSessionBundle(sessionId);
  if (!bundle) {
    releaseAskSlot(sessionId);
    return;
  }

  const session = bundle.session;
  const taskType = classifyCouncilQuestion(session.question);
  const executionPlan = planCouncilExecution({
    mode: session.mode,
    agentCount: session.agentCount,
  });
  const roles = getCouncilRoles(
    taskType,
    executionPlan.normalizedMode,
    executionPlan.normalizedAgentCount,
  );
  const assignments = getCouncilAssignments({
    roles,
    strategy: session.modelStrategy,
    priority: session.priority,
    requestedModel: session.requestedModel,
    requestedProvider: session.requestedProvider,
  });
  const rounds = buildRoundPlan(executionPlan.normalizedMode, roles);
  const concurrency = Math.max(
    1,
    Math.min(
      executionPlan.activeAgents,
      session.maxActiveAgents,
      runtimeCapabilities.askMaxActiveAgents,
    ),
  );
  const normalizedSession = {
    ...session,
    mode: executionPlan.normalizedMode,
    agentCount: executionPlan.normalizedAgentCount,
    maxActiveAgents: executionPlan.activeAgents,
  };

  emitProgressEvent(session.id, {
    type: "ask.started",
    sessionId: session.id,
    mode: executionPlan.normalizedMode,
  });
  emitProgressEvent(session.id, {
    type: "ask.agent.assigned",
    sessionId: session.id,
    assignments,
  });

  await storage.updateAskSession(session.id, {
    ...normalizedSession,
    status: "running",
    canonicalSummary: {
      ...normalizedSession.canonicalSummary,
      taskType,
      classification: taskType,
      assignments,
    },
    metadata: {
      ...buildCouncilMetadata({
        session: {
          ...normalizedSession,
          metadata: normalizedSession.metadata,
        },
      }),
      taskType,
      rounds: rounds.map((round) => round.roundType),
    },
    completedAt: null,
  });

  const existingBundle = await storage.getAskSessionBundle(session.id);
  let currentTurnIndex = nextTurnIndex(existingBundle);
  let currentRoundIndex = nextRoundIndex(existingBundle);
  const newTurns: AskTurn[] = [];
  const totalRounds = rounds.length;

  try {
    for (let roundOffset = 0; roundOffset < rounds.length; roundOffset += 1) {
      const round = rounds[roundOffset]!;

      emitProgressEvent(session.id, {
        type: "ask.progress",
        sessionId: session.id,
        message: `${titleCase(round.roundType)} round in progress`,
        percent: Math.round((roundOffset / (totalRounds + 1)) * 100),
      });
      emitProgressEvent(session.id, {
        type: "ask.round.started",
        sessionId: session.id,
        roundIndex: currentRoundIndex,
        roundType: round.roundType,
        roles: round.roles,
      });

      await runInBatches(round.roles, Math.max(1, concurrency), async (role) => {
        const assignment = assignments.find((item) => item.role === role)!;
        const turn: AskTurn = {
          id: randomUUID(),
          sessionId: session.id,
          role,
          roundIndex: currentRoundIndex,
          roundType: round.roundType,
          turnIndex: currentTurnIndex++,
          status: "running",
          model: assignment.model,
          provider: assignment.provider,
          inputSummary: `${titleCase(role)} is responding in the ${round.roundType} round.`,
          outputJson: {},
          summaryText: `${titleCase(role)} is thinking...`,
          createdAt: new Date().toISOString(),
        };

        emitProgressEvent(session.id, {
          type: "ask.turn.started",
          sessionId: session.id,
          turn,
        });

        const priorTurns = [...bundle.turns, ...newTurns];
        const result = await runCouncilTurn({
          session: normalizedSession,
          role,
          roundIndex: currentRoundIndex,
          roundType: round.roundType,
          assignment,
          question: session.question,
          taskType,
          priorTurns,
        });

        const completedTurn: AskTurn = {
          ...turn,
          status: "completed",
          model: result.model,
          provider: result.provider,
          outputJson: result.output,
          summaryText: result.output.summary,
          metadata: result.metadata,
        };

        await storage.appendAskTurn(session.id, completedTurn);
        newTurns.push(completedTurn);

        emitProgressEvent(session.id, {
          type: "ask.turn.completed",
          sessionId: session.id,
          turnId: completedTurn.id,
          role: completedTurn.role,
          roundIndex: completedTurn.roundIndex,
          roundType: completedTurn.roundType,
        });
      });

      currentRoundIndex += 1;
    }

    const latestBundle = await storage.getAskSessionBundle(session.id);
    const finalTurn =
      latestBundle?.turns.at(-1) ??
      newTurns.at(-1);

    if (!finalTurn) {
      throw new Error("No council turns were generated.");
    }

    const finalAnswer = String(finalTurn.outputJson.answer ?? finalTurn.summaryText ?? "");
    const canonicalSummary = buildCanonicalSummary({
      session: normalizedSession,
      taskType,
      assignments,
      finalTurn,
      newTurns,
    });

    await storage.updateAskSession(session.id, {
      ...normalizedSession,
      status: "completed",
      finalAnswer,
      canonicalSummary,
      metadata: {
        ...normalizedSession.metadata,
        lastCompletedAt: new Date().toISOString(),
      },
      completedAt: new Date().toISOString(),
    });

    const completedBundle = await storage.getAskSessionBundle(session.id);
    if (!completedBundle) {
      throw new Error("Unable to load the completed ask session.");
    }

    emitProgressEvent(session.id, {
      type: "ask.progress",
      sessionId: session.id,
      message: "Council synthesis complete",
      percent: 100,
    });
    emitProgressEvent(session.id, {
      type: "ask.completed",
      sessionId: session.id,
      session: completedBundle,
    });
  } catch (error) {
    await storage.updateAskSession(session.id, {
      ...normalizedSession,
      status: "failed",
      metadata: {
        ...normalizedSession.metadata,
        error: error instanceof Error ? error.message : "Ask session failed.",
      },
      completedAt: new Date().toISOString(),
    });

    emitProgressEvent(session.id, {
      type: "ask.failed",
      sessionId: session.id,
      status: "failed",
      error: error instanceof Error ? error.message : "Ask session failed.",
    });
  } finally {
    releaseAskSlot(session.id);
  }
}

export async function startAskSession(input: StartAskSessionInput) {
  const storage = getStorageAdapter();
  const sessionId = randomUUID();
  acquireAskSlot(sessionId);
  const executionPlan = planCouncilExecution({
    mode: input.mode,
    agentCount: input.agentCount,
  });

  try {
    const session = await storage.createAskSession({
      id: sessionId,
      title: buildSessionTitle(input.question),
      threadId: randomUUID(),
      status: "pending",
      question: input.question,
      mode: executionPlan.normalizedMode,
      agentCount: executionPlan.normalizedAgentCount,
      modelStrategy: input.modelStrategy,
      answerStyle: input.answerStyle,
      priority: input.priority,
      showDebateProcess: input.showDebateProcess,
      finalAnswerOnly: input.finalAnswerOnly,
      webLookupAllowed: input.webLookupAllowed,
      toolsAllowed: input.toolsAllowed,
      maxActiveAgents: executionPlan.activeAgents,
      requestedModel: input.requestedModel ?? null,
      requestedProvider: input.requestedProvider ?? null,
      finalAnswer: "",
      canonicalSummary: {
        taskType: "general",
        classification: "general",
        contextSummary: "",
        keySupportingViewpoints: [],
        disagreements: [],
        actionPlan: [],
        minorityView: "",
        confidence: 0,
        finalAnswerModel: "",
        finalAnswerProvider: "",
        assignments: [],
        history: [],
      },
      metadata: buildCouncilMetadata({
        session: {
          mode: executionPlan.normalizedMode,
          agentCount: executionPlan.normalizedAgentCount,
          metadata: {
            slug: slugify(input.question).slice(0, 48),
          },
        },
      }),
      completedAt: null,
    });

    void executeAskSession(session.id);
    return session;
  } catch (error) {
    releaseAskSlot(sessionId);
    throw error;
  }
}

export async function continueAskSession(
  sessionId: string,
  patch: Partial<StartAskSessionInput>,
) {
  const storage = getStorageAdapter();
  const bundle = await storage.getAskSessionBundle(sessionId);
  if (!bundle) {
    return null;
  }

  acquireAskSlot(sessionId);
  const executionPlan = planCouncilExecution({
    mode: patch.mode ?? bundle.session.mode,
    agentCount: patch.agentCount ?? bundle.session.agentCount,
  });

  try {
    const updatedSession =
      (await storage.updateAskSession(sessionId, {
        ...bundle.session,
        title: buildSessionTitle(patch.question ?? bundle.session.question),
        question: patch.question ?? bundle.session.question,
        mode: executionPlan.normalizedMode,
        agentCount: executionPlan.normalizedAgentCount,
        modelStrategy: patch.modelStrategy ?? bundle.session.modelStrategy,
        answerStyle: patch.answerStyle ?? bundle.session.answerStyle,
        priority: patch.priority ?? bundle.session.priority,
        showDebateProcess:
          patch.showDebateProcess ?? bundle.session.showDebateProcess,
        finalAnswerOnly: patch.finalAnswerOnly ?? bundle.session.finalAnswerOnly,
        webLookupAllowed: patch.webLookupAllowed ?? bundle.session.webLookupAllowed,
        toolsAllowed: patch.toolsAllowed ?? bundle.session.toolsAllowed,
        maxActiveAgents: executionPlan.activeAgents,
        requestedModel: patch.requestedModel ?? bundle.session.requestedModel,
        requestedProvider: patch.requestedProvider ?? bundle.session.requestedProvider,
        status: "pending",
        finalAnswer: "",
        completedAt: null,
        metadata: buildCouncilMetadata({
          session: {
            ...bundle.session,
            mode: executionPlan.normalizedMode,
            agentCount: executionPlan.normalizedAgentCount,
            metadata: {
              ...bundle.session.metadata,
              rerunCount: Number(bundle.session.metadata.rerunCount ?? 0) + 1,
            },
          },
        }),
      })) ?? bundle.session;

    void executeAskSession(updatedSession.id);
    return updatedSession;
  } catch (error) {
    releaseAskSlot(sessionId);
    throw error;
  }
}
