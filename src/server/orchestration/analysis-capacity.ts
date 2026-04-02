import { runtimeCapabilities } from "@/env";

declare global {
  var __repocouncil_active_runs__: Set<string> | undefined;
}

function getRegistry() {
  if (!global.__repocouncil_active_runs__) {
    global.__repocouncil_active_runs__ = new Set();
  }

  return global.__repocouncil_active_runs__;
}

export function getActiveAnalysisCount() {
  return getRegistry().size;
}

export function getAnalysisCapacitySnapshot() {
  return {
    activeRuns: getActiveAnalysisCount(),
    maxConcurrency: runtimeCapabilities.analysisMaxConcurrency,
  };
}

export function acquireAnalysisSlot(runId: string) {
  const registry = getRegistry();
  if (registry.size >= runtimeCapabilities.analysisMaxConcurrency) {
    const error = new Error(
      `Analysis capacity reached (${runtimeCapabilities.analysisMaxConcurrency}). Wait for an active run to finish or resume an interrupted run.`,
    );
    Object.assign(error, { statusCode: 429 });
    throw error;
  }

  registry.add(runId);
}

export function releaseAnalysisSlot(runId: string) {
  getRegistry().delete(runId);
}
