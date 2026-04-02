import { EventEmitter } from "events";

import type { ProgressEvent } from "@/lib/contracts/api";

declare global {
  var __repocouncil_progress_bus__: Map<string, EventEmitter> | undefined;
}

function getRegistry() {
  if (!global.__repocouncil_progress_bus__) {
    global.__repocouncil_progress_bus__ = new Map();
  }

  return global.__repocouncil_progress_bus__;
}

function getEmitter(runId: string) {
  const registry = getRegistry();
  if (!registry.has(runId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    registry.set(runId, emitter);
  }
  return registry.get(runId)!;
}

export function emitProgressEvent(runId: string, event: ProgressEvent) {
  getEmitter(runId).emit("event", event);
}

export function subscribeToRun(
  runId: string,
  listener: (event: ProgressEvent) => void,
) {
  const emitter = getEmitter(runId);
  emitter.on("event", listener);
  return () => {
    emitter.off("event", listener);
  };
}
