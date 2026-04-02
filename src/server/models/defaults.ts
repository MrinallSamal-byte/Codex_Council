import type { ModelSetting } from "@/lib/contracts/domain";

const agentEnvKeys = {
  scout: "OPENROUTER_MODEL_SCOUT",
  architect: "OPENROUTER_MODEL_ARCHITECT",
  security: "OPENROUTER_MODEL_SECURITY",
  implementation: "OPENROUTER_MODEL_IMPLEMENTATION",
  product: "OPENROUTER_MODEL_PRODUCT",
  judge: "OPENROUTER_MODEL_JUDGE",
} as const;

const defaultModels = {
  scout: "qwen/qwen3.6-plus:free",
  architect: "qwen/qwen3.6-plus:free",
  security: "qwen/qwen3.6-plus:free",
  implementation: "qwen/qwen3-coder:free",
  product: "qwen/qwen3.6-plus:free",
  judge: "qwen/qwen3.6-plus:free",
} as const;

export function getDefaultModelSettings(repositoryId?: string | null): ModelSetting[] {
  return [
    {
      repositoryId,
      agentName: "scout",
      provider: "openrouter",
      model: process.env[agentEnvKeys.scout] ?? defaultModels.scout,
      temperature: 0.1,
      fallbackModels: ["qwen/qwen3-coder:free", "openrouter/free"],
    },
    {
      repositoryId,
      agentName: "architect",
      provider: "openrouter",
      model: process.env[agentEnvKeys.architect] ?? defaultModels.architect,
      temperature: 0.2,
      fallbackModels: ["qwen/qwen3-coder:free", "qwen/qwen3.6-plus-preview:free", "openrouter/free"],
    },
    {
      repositoryId,
      agentName: "security",
      provider: "openrouter",
      model: process.env[agentEnvKeys.security] ?? defaultModels.security,
      temperature: 0.1,
      fallbackModels: ["qwen/qwen3-coder:free", "qwen/qwen3.6-plus-preview:free", "openrouter/free"],
    },
    {
      repositoryId,
      agentName: "implementation",
      provider: "openrouter",
      model: process.env[agentEnvKeys.implementation] ?? defaultModels.implementation,
      temperature: 0.1,
      fallbackModels: ["qwen/qwen3.6-plus:free", "qwen/qwen3.6-plus-preview:free", "openrouter/free"],
    },
    {
      repositoryId,
      agentName: "product",
      provider: "openrouter",
      model: process.env[agentEnvKeys.product] ?? defaultModels.product,
      temperature: 0.4,
      fallbackModels: ["qwen/qwen3.6-plus-preview:free", "openrouter/free"],
    },
    {
      repositoryId,
      agentName: "judge",
      provider: "openrouter",
      model: process.env[agentEnvKeys.judge] ?? defaultModels.judge,
      temperature: 0.2,
      fallbackModels: ["qwen/qwen3-coder:free", "qwen/qwen3.6-plus-preview:free", "openrouter/free"],
    },
  ];
}
