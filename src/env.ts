import { z } from "zod";

const defaultRepoStorageRoot =
  process.env.NODE_ENV === "production"
    ? "/tmp/repocouncil/workspaces"
    : ".repocouncil/workspaces";
const defaultExportStorageRoot =
  process.env.NODE_ENV === "production"
    ? "/tmp/repocouncil/exports"
    : ".repocouncil/exports";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  REPO_STORAGE_ROOT: z.string().default(defaultRepoStorageRoot),
  EXPORT_STORAGE_ROOT: z.string().default(defaultExportStorageRoot),
  ANALYSIS_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(1),
  ASK_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(1),
  ASK_MAX_ACTIVE_AGENTS: z.coerce.number().int().min(1).max(6).default(2),
  ASK_MAX_PARTICIPANTS: z.coerce.number().int().min(1).max(6).default(6),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ENABLE_SEMGREP: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  ENABLE_CODEQL: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  REPO_STORAGE_ROOT: process.env.REPO_STORAGE_ROOT,
  EXPORT_STORAGE_ROOT: process.env.EXPORT_STORAGE_ROOT,
  ANALYSIS_MAX_CONCURRENCY: process.env.ANALYSIS_MAX_CONCURRENCY,
  ASK_MAX_CONCURRENCY: process.env.ASK_MAX_CONCURRENCY,
  ASK_MAX_ACTIVE_AGENTS: process.env.ASK_MAX_ACTIVE_AGENTS,
  ASK_MAX_PARTICIPANTS: process.env.ASK_MAX_PARTICIPANTS,
  LOG_LEVEL: process.env.LOG_LEVEL,
  ENABLE_SEMGREP: process.env.ENABLE_SEMGREP,
  ENABLE_CODEQL: process.env.ENABLE_CODEQL,
  DEMO_MODE: process.env.DEMO_MODE,
});

export const runtimeCapabilities = {
  hasDatabase: Boolean(env.DATABASE_URL),
  hasRedis: Boolean(env.REDIS_URL),
  hasOpenRouter: Boolean(env.OPENROUTER_API_KEY),
  semgrepEnabled: env.ENABLE_SEMGREP,
  codeQlEnabled: env.ENABLE_CODEQL,
  demoMode: env.DEMO_MODE,
  analysisMaxConcurrency: env.ANALYSIS_MAX_CONCURRENCY,
  askMaxConcurrency: env.ASK_MAX_CONCURRENCY,
  askMaxActiveAgents: env.ASK_MAX_ACTIVE_AGENTS,
  askMaxParticipants: env.ASK_MAX_PARTICIPANTS,
  logLevel: env.LOG_LEVEL,
} as const;
