import { env, runtimeCapabilities } from "@/env";
import { pingDatabase } from "@/server/db/client";
import { getAnalysisCapacitySnapshot } from "@/server/orchestration/analysis-capacity";

export async function getHealthSnapshot() {
  return {
    status: "ok" as const,
    service: "repocouncil",
    environment: env.NODE_ENV,
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    databaseConfigured: runtimeCapabilities.hasDatabase,
    redisConfigured: runtimeCapabilities.hasRedis,
    demoMode: runtimeCapabilities.demoMode,
    analysisCapacity: getAnalysisCapacitySnapshot(),
  };
}

export async function getReadinessSnapshot() {
  const checks = {
    database: {
      configured: runtimeCapabilities.hasDatabase,
      ready: false,
      detail: runtimeCapabilities.hasDatabase
        ? "Database connectivity has not been checked yet."
        : "Running in demo mode without a database connection.",
    },
  };

  if (runtimeCapabilities.hasDatabase) {
    try {
      await pingDatabase();
      checks.database.ready = true;
      checks.database.detail = "Database connection succeeded.";
    } catch (error) {
      checks.database.ready = false;
      checks.database.detail =
        error instanceof Error ? error.message : "Database connection failed.";
    }
  } else {
    checks.database.ready = runtimeCapabilities.demoMode;
  }

  const ready = checks.database.ready;

  return {
    status: ready ? ("ready" as const) : ("degraded" as const),
    service: "repocouncil",
    environment: env.NODE_ENV,
    time: new Date().toISOString(),
    checks,
    analysisCapacity: getAnalysisCapacitySnapshot(),
  };
}
