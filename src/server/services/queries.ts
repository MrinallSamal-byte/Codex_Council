import { getStorageAdapter } from "../db";
import { createDemoBundle } from "../demo/data";
import { createDemoAskSessionBundle } from "../demo/council";

export async function listRepositories() {
  const storage = getStorageAdapter();
  return storage.listRepositories();
}

export async function getLatestAnalysisBundle(runId?: string) {
  const storage = getStorageAdapter();

  if (runId) {
    return storage.getAnalysisBundle(runId);
  }

  const repositories = await storage.listRepositories();
  if (repositories.length === 0) {
    return createDemoBundle();
  }

  const runs = await storage.listAnalysisRuns(repositories[0].id);
  if (runs.length === 0) {
    return createDemoBundle();
  }

  return storage.getAnalysisBundle(runs[0].id);
}

export async function getFindings(runId: string, category?: string) {
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return [];
  }
  return category ? bundle.findings.filter((finding) => finding.category === category) : bundle.findings;
}

export async function getGraph(runId: string) {
  const bundle = await getLatestAnalysisBundle(runId);
  return bundle?.graph ?? { nodes: [], edges: [] };
}

export async function getDebateState(runId: string) {
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return {
    turns: bundle.turns,
    snapshots: bundle.snapshots,
    latestSummary: bundle.snapshots.at(-1)?.canonicalState,
  };
}

export async function listAskSessions(limit?: number) {
  const storage = getStorageAdapter();
  const sessions = await storage.listAskSessions(limit);
  return sessions.length > 0 ? sessions : [createDemoAskSessionBundle().session];
}

export async function getLatestAskSessionBundle(sessionId?: string) {
  const storage = getStorageAdapter();

  if (sessionId) {
    return storage.getAskSessionBundle(sessionId);
  }

  const sessions = await storage.listAskSessions(1);
  if (sessions.length === 0) {
    return createDemoAskSessionBundle();
  }

  return storage.getAskSessionBundle(sessions[0].id);
}
