import type {
  AnswerStyle,
  AskAgentAssignment,
  AskAgentRole,
  AskMode,
  AskRoundType,
  AskSession,
  AskTurn,
  ResponsePriority,
} from "@/lib/contracts/domain";

function describeMode(mode: AskMode) {
  if (mode === "normal") {
    return "Normal mode: answer directly, clearly, and efficiently.";
  }

  if (mode === "deep_council") {
    return "Deep Council mode: use stronger structure, critique assumptions, and improve the answer before synthesis.";
  }

  return "Debate mode: offer a clear first-pass answer, then react to competing viewpoints.";
}

function describeStyle(style: AnswerStyle) {
  if (style === "concise") {
    return "Keep the answer compact and high-signal.";
  }

  if (style === "detailed") {
    return "Provide rich reasoning, examples, and concrete detail.";
  }

  return "Balance clarity, reasoning depth, and brevity.";
}

function describePriority(priority: ResponsePriority) {
  if (priority === "speed") {
    return "Prioritize speed and directness over exhaustiveness.";
  }

  if (priority === "quality") {
    return "Prioritize robustness, nuance, and decision usefulness.";
  }

  return "Balance speed and quality.";
}

export function buildCouncilSystemPrompt(params: {
  role: AskAgentRole;
  mode: AskMode;
  roundType: AskRoundType;
  answerStyle: AnswerStyle;
  priority: ResponsePriority;
}) {
  const roleInstructions: Record<AskAgentRole, string> = {
    researcher:
      "You gather structure, likely facts, and the strongest framing available from the provided context. Distinguish facts from inference.",
    skeptic:
      "You challenge weak assumptions, hidden trade-offs, and overconfidence. Push for precision.",
    strategist:
      "You organize the problem, choose a path, and build a clear plan or recommendation.",
    builder:
      "You translate ideas into implementation detail, practical steps, and executable advice.",
    critic:
      "You review the answer for flaws, regressions, missing cases, and unsupported claims.",
    judge:
      "You synthesize the strongest final answer. Resolve conflicts instead of concatenating viewpoints.",
    product:
      "You focus on user value, leverage, prioritization, and product sense.",
    security:
      "You focus on trust boundaries, misuse, safety, privacy, and operational risk.",
    ux:
      "You focus on usability, clarity, friction, and human experience.",
    teacher:
      "You explain complex ideas so they are easier to understand and apply.",
    devils_advocate:
      "You defend the strongest minority or contrarian position available.",
    optimizer:
      "You simplify, compress, and find efficiency or leverage wins.",
  };

  return [
    `You are the ${params.role} agent in RepoCouncil's AI Council.`,
    roleInstructions[params.role],
    describeMode(params.mode),
    describeStyle(params.answerStyle),
    describePriority(params.priority),
    params.roundType === "critique"
      ? "This is a critique round. Focus on what is missing, brittle, or overstated."
      : null,
    params.roundType === "refinement"
      ? "This is a refinement round. Improve the answer after seeing critiques."
      : null,
    params.roundType === "judgment"
      ? "This is the synthesis round. Produce the best final answer and surface any minority view that still matters."
      : null,
    "Return only valid JSON.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCouncilUserPrompt(params: {
  session: AskSession;
  role: AskAgentRole;
  roundIndex: number;
  roundType: AskRoundType;
  assignment: AskAgentAssignment;
  question: string;
  taskType: string;
  priorTurns: AskTurn[];
}) {
  return JSON.stringify(
    {
      session: {
        id: params.session.id,
        title: params.session.title,
        mode: params.session.mode,
        answerStyle: params.session.answerStyle,
        priority: params.session.priority,
        showDebateProcess: params.session.showDebateProcess,
      },
      question: params.question,
      taskType: params.taskType,
      role: params.role,
      round: {
        index: params.roundIndex,
        type: params.roundType,
      },
      assignment: params.assignment,
      sessionSummary: params.session.canonicalSummary,
      priorTurns: params.priorTurns.map((turn) => ({
        role: turn.role,
        roundIndex: turn.roundIndex,
        roundType: turn.roundType,
        summaryText: turn.summaryText,
        output: turn.outputJson,
      })),
      instructions: {
        opening:
          "Provide an independent first-pass answer with a useful angle for your role.",
        critique:
          "Respond to earlier turns. Identify what is weak, missing, or deserves revision.",
        refinement:
          "Refine your position after reading critiques and preserve only the strongest points.",
        judgment:
          "Synthesize the best final answer for the user. Include major supporting viewpoints, disagreements if relevant, confidence, and next steps when useful.",
      }[params.roundType],
    },
    null,
    2,
  );
}
