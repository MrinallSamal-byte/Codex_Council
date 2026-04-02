import { runtimeCapabilities } from "@/env";
import type { ModelSetting } from "@/lib/contracts/domain";

export type ModelVerification = {
  agentName: ModelSetting["agentName"];
  provider: string;
  primaryModel: string;
  candidateModels: string[];
  ready: boolean;
  reason: string;
};

export function verifyModelSetting(setting: ModelSetting): ModelVerification {
  const candidateModels = [setting.model, ...setting.fallbackModels].filter(Boolean);

  if (!runtimeCapabilities.hasOpenRouter) {
    return {
      agentName: setting.agentName,
      provider: setting.provider,
      primaryModel: setting.model,
      candidateModels,
      ready: false,
      reason: "OPENROUTER_API_KEY is not configured; heuristic fallback will be used.",
    };
  }

  if (candidateModels.length === 0) {
    return {
      agentName: setting.agentName,
      provider: setting.provider,
      primaryModel: setting.model,
      candidateModels,
      ready: false,
      reason: "No primary or fallback models configured.",
    };
  }

  return {
    agentName: setting.agentName,
    provider: setting.provider,
    primaryModel: setting.model,
    candidateModels,
    ready: true,
    reason: `${candidateModels.length} model candidate(s) will be attempted through ${setting.provider}.`,
  };
}

export function verifyModelSettings(settings: ModelSetting[]) {
  return settings.map(verifyModelSetting);
}
