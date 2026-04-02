import { runtimeCapabilities } from "@/env";

declare global {
  var __repocouncil_active_ask_sessions__: Set<string> | undefined;
}

function getRegistry() {
  if (!global.__repocouncil_active_ask_sessions__) {
    global.__repocouncil_active_ask_sessions__ = new Set();
  }

  return global.__repocouncil_active_ask_sessions__;
}

export function acquireAskSlot(sessionId: string) {
  const registry = getRegistry();
  if (registry.size >= runtimeCapabilities.askMaxConcurrency) {
    const error = new Error(
      `Ask session capacity reached (${runtimeCapabilities.askMaxConcurrency}). Wait for an active council run to finish.`,
    );
    Object.assign(error, { statusCode: 429 });
    throw error;
  }

  registry.add(sessionId);
}

export function releaseAskSlot(sessionId: string) {
  getRegistry().delete(sessionId);
}
