import { runtimeCapabilities } from "@/env";
import type {
  AskAgentAssignment,
  AskAgentRole,
  AskMode,
  ModelStrategy,
  ResponsePriority,
} from "@/lib/contracts/domain";
import { titleCase } from "@/lib/utils";
import type { ModelExecutionSetting } from "@/server/models/openrouter";

export type CouncilTaskType =
  | "coding"
  | "architecture"
  | "product"
  | "study"
  | "decision"
  | "research"
  | "writing"
  | "security"
  | "general";

const provider = "openrouter";
const defaultGeneralModel =
  process.env.OPENROUTER_MODEL_COUNCIL_GENERAL ?? "qwen/qwen3.6-plus:free";
const defaultCoderModel =
  process.env.OPENROUTER_MODEL_COUNCIL_CODER ?? "qwen/qwen3-coder:free";
const defaultJudgeModel =
  process.env.OPENROUTER_MODEL_COUNCIL_JUDGE ?? "qwen/qwen3.6-plus:free";

const fallbackModels = [
  "qwen/qwen3.6-plus:free",
  "qwen/qwen3-coder:free",
  "openrouter/free",
].filter(Boolean);

const roleRationales: Record<AskAgentRole, string> = {
  researcher: "Surfaces structure, likely facts, and useful frames quickly.",
  skeptic: "Challenges assumptions and catches weak reasoning.",
  strategist: "Turns ambiguity into a clear plan or decision path.",
  builder: "Translates ideas into concrete implementation steps.",
  critic: "Identifies blind spots, regressions, and trade-offs.",
  judge: "Synthesizes the strongest final answer from the debate.",
  product: "Focuses on value, users, and product leverage.",
  security: "Stresses safety, abuse, and risk boundaries.",
  ux: "Protects usability, clarity, and user flow quality.",
  teacher: "Explains complex ideas in a way that is easier to learn from.",
  devils_advocate: "Pushes the least comfortable counter-position.",
  optimizer: "Looks for efficiency, simplification, and leverage.",
};

const taskRolePresets: Record<CouncilTaskType, AskAgentRole[]> = {
  coding: ["builder", "strategist", "critic", "researcher", "skeptic", "judge"],
  architecture: ["strategist", "builder", "skeptic", "critic", "researcher", "judge"],
  product: ["product", "strategist", "ux", "skeptic", "optimizer", "judge"],
  study: ["teacher", "researcher", "critic", "skeptic", "strategist", "judge"],
  decision: ["strategist", "skeptic", "researcher", "critic", "optimizer", "judge"],
  research: ["researcher", "skeptic", "strategist", "critic", "teacher", "judge"],
  writing: ["teacher", "critic", "strategist", "researcher", "optimizer", "judge"],
  security: ["security", "skeptic", "builder", "critic", "researcher", "judge"],
  general: ["researcher", "strategist", "skeptic", "critic", "teacher", "judge"],
};

const roleTemperatures: Record<AskAgentRole, number> = {
  researcher: 0.2,
  skeptic: 0.3,
  strategist: 0.3,
  builder: 0.2,
  critic: 0.2,
  judge: 0.2,
  product: 0.4,
  security: 0.2,
  ux: 0.4,
  teacher: 0.3,
  devils_advocate: 0.4,
  optimizer: 0.2,
};

export function classifyCouncilQuestion(question: string): CouncilTaskType {
  const normalized = question.toLowerCase();

  if (/(secure|security|auth|vulnerab|exploit|privacy|attack|risk)/.test(normalized)) {
    return "security";
  }

  if (/(code|bug|debug|function|typescript|javascript|react|node|api|algorithm)/.test(normalized)) {
    return "coding";
  }

  if (/(architect|system design|scal|microservice|monolith|infra|platform)/.test(normalized)) {
    return "architecture";
  }

  if (/(startup|gtm|pricing|roadmap|user|product|market|feature)/.test(normalized)) {
    return "product";
  }

  if (/(study|learn|explain|teach|understand|difference between)/.test(normalized)) {
    return "study";
  }

  if (/(choose|decision|should i|pros and cons|compare|versus|vs\\.)/.test(normalized)) {
    return "decision";
  }

  if (/(research|sources|survey|landscape|benchmark)/.test(normalized)) {
    return "research";
  }

  if (/(write|rewrite|edit|email|essay|blog|copy|tone)/.test(normalized)) {
    return "writing";
  }

  return "general";
}

export function getCouncilRoles(
  taskType: CouncilTaskType,
  mode: AskMode,
  requestedAgentCount: number,
): AskAgentRole[] {
  const maxParticipants = runtimeCapabilities.askMaxParticipants;
  const clampedCount = Math.min(Math.max(requestedAgentCount, 1), maxParticipants);

  if (mode === "normal" || clampedCount === 1) {
    return [taskRolePresets[taskType][0]];
  }

  const baseRoles = taskRolePresets[taskType];
  const participantCount = Math.max(2, clampedCount);
  const roleSet = new Set<AskAgentRole>();

  for (const role of baseRoles) {
    if (role === "judge") {
      continue;
    }

    roleSet.add(role);
    if (roleSet.size >= participantCount - 1) {
      break;
    }
  }

  if (mode === "deep_council" && roleSet.size < participantCount - 1) {
    for (const extraRole of ["researcher", "skeptic", "critic", "optimizer"] as AskAgentRole[]) {
      roleSet.add(extraRole);
      if (roleSet.size >= participantCount - 1) {
        break;
      }
    }
  }

  return [...roleSet, "judge"].slice(0, participantCount) as AskAgentRole[];
}

function pickModelForRole(
  role: AskAgentRole,
  strategy: ModelStrategy,
  priority: ResponsePriority,
  requestedModel?: string | null,
) {
  if (strategy === "single" && requestedModel) {
    return requestedModel;
  }

  if (strategy === "mixed") {
    if (["builder", "security", "optimizer"].includes(role)) {
      return defaultCoderModel;
    }
    if (role === "judge") {
      return defaultJudgeModel;
    }
    return defaultGeneralModel;
  }

  if (role === "judge") {
    return defaultJudgeModel;
  }

  if (priority === "speed") {
    return ["builder", "security"].includes(role) ? defaultCoderModel : defaultGeneralModel;
  }

  if (["builder", "security", "optimizer"].includes(role)) {
    return defaultCoderModel;
  }

  if (priority === "quality" && ["researcher", "strategist", "teacher"].includes(role)) {
    return defaultGeneralModel;
  }

  return defaultGeneralModel;
}

export function getCouncilAssignment(params: {
  role: AskAgentRole;
  strategy: ModelStrategy;
  priority: ResponsePriority;
  requestedModel?: string | null;
  requestedProvider?: string | null;
}) {
  const model = pickModelForRole(
    params.role,
    params.strategy,
    params.priority,
    params.requestedModel,
  );

  return {
    role: params.role,
    label: titleCase(params.role),
    rationale: roleRationales[params.role],
    provider: params.requestedProvider ?? provider,
    model,
    fallbackModels:
      params.strategy === "single" && params.requestedModel ? fallbackModels : fallbackModels,
    active: true,
  } satisfies AskAgentAssignment;
}

export function getCouncilAssignments(params: {
  roles: AskAgentRole[];
  strategy: ModelStrategy;
  priority: ResponsePriority;
  requestedModel?: string | null;
  requestedProvider?: string | null;
}) {
  return params.roles.map((role) =>
    getCouncilAssignment({
      role,
      strategy: params.strategy,
      priority: params.priority,
      requestedModel: params.requestedModel,
      requestedProvider: params.requestedProvider,
    }),
  );
}

export function assignmentToModelSetting(assignment: AskAgentAssignment): ModelExecutionSetting {
  return {
    agentName: assignment.role,
    provider: assignment.provider,
    model: assignment.model,
    temperature: roleTemperatures[assignment.role],
    maxTokens: assignment.role === "judge" ? 2200 : 1800,
    fallbackModels: assignment.fallbackModels,
  };
}
