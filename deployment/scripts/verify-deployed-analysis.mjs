#!/usr/bin/env node

import { randomUUID } from "crypto";
import { access } from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error("Usage: node deployment/scripts/verify-deployed-analysis.mjs <base-url>");
  console.error(
    "Example: node deployment/scripts/verify-deployed-analysis.mjs http://127.0.0.1:3000",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const exportRoot = process.env.EXPORT_STORAGE_ROOT || "/var/lib/repocouncil/exports";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `POST ${url} failed with ${response.status}: ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `GET ${url} failed with ${response.status}: ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function collectSseEvents(url, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
    },
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Unable to open SSE stream at ${url}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      while (buffer.includes("\n\n")) {
        const boundaryIndex = buffer.indexOf("\n\n");
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data: "));
        if (!dataLine) {
          continue;
        }

        const payload = JSON.parse(dataLine.slice(6));
        events.push(payload);

        if (payload.type === "analysis.completed" || payload.type === "analysis.failed") {
          controller.abort();
          break;
        }
      }
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }

  return events;
}

async function waitForRunCompletion(runId, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getJson(`${baseUrl}/api/analysis/${runId}/status`);
    if (["completed", "failed", "canceled"].includes(status.run.status)) {
      return status;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for analysis run ${runId} to complete.`);
}

async function downloadMarkdownReport(runId) {
  const response = await fetch(`${baseUrl}/api/analysis/${runId}/report?download=true`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Report download failed for run ${runId}: ${text}`);
  }
  return text;
}

async function verifyExportArtifactExists(runId, repositoryName) {
  const filename = `${slugify(repositoryName) || "analysis"}-report.md`;
  const filePath = path.join(exportRoot, runId, filename);
  await access(filePath);
  return filePath;
}

async function createSyntheticCheckpointRun(sourceRunId) {
  const source = await prisma.analysisRun.findUnique({
    where: { id: sourceRunId },
    include: {
      repository: true,
      agentTurns: {
        orderBy: { turnIndex: "asc" },
      },
      memorySnapshots: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!source) {
    throw new Error(`Source run ${sourceRunId} not found for checkpoint verification.`);
  }

  const partialTurns = source.agentTurns
    .filter((turn) => turn.agentName !== "JUDGE")
    .slice(0, Math.max(1, source.agentTurns.length - 2));
  const partialSnapshots = source.memorySnapshots.slice(
    0,
    Math.max(1, source.memorySnapshots.length - 1),
  );

  assert(partialTurns.length > 0, "Need at least one persisted turn to test resume.");
  assert(
    partialSnapshots.length > 0,
    "Need at least one persisted snapshot to test resume.",
  );

  const syntheticRunId = randomUUID();
  await prisma.analysisRun.create({
    data: {
      id: syntheticRunId,
      repositoryId: source.repositoryId,
      status: "PENDING",
      threadId: randomUUID(),
      summary: {
        syntheticCheckpoint: true,
        recoverable: true,
        note: "Synthetic persisted checkpoint used by deployment verification.",
      },
    },
  });

  await prisma.agentTurn.createMany({
    data: partialTurns.map((turn, index) => ({
      id: randomUUID(),
      analysisRunId: syntheticRunId,
      agentName: turn.agentName,
      model: turn.model,
      provider: turn.provider,
      turnIndex: index,
      inputSummary: turn.inputSummary,
      outputJson: turn.outputJson,
      evidenceRefs: turn.evidenceRefs,
      metadata: turn.metadata,
      createdAt: turn.createdAt,
    })),
  });

  await prisma.memorySnapshot.createMany({
    data: partialSnapshots.map((snapshot) => ({
      id: randomUUID(),
      analysisRunId: syntheticRunId,
      snapshotType: snapshot.snapshotType,
      canonicalState: snapshot.canonicalState,
      summaryText: snapshot.summaryText,
      tokenEstimate: snapshot.tokenEstimate,
      createdAt: snapshot.createdAt,
    })),
  });

  return {
    syntheticRunId,
    sourceRepositoryName: source.repository.name,
    partialTurnsCount: partialTurns.length,
    partialSnapshotsCount: partialSnapshots.length,
  };
}

async function main() {
  console.log(`[verify] Importing demo repository via ${baseUrl}`);
  const importPayload = await postJson(`${baseUrl}/api/repos/import`, {
    useDemo: true,
  });
  const repository = importPayload.repository;
  assert(repository?.id, "Demo repository import did not return a repository id.");

  console.log(`[verify] Starting analysis for repository ${repository.id}`);
  const startPayload = await postJson(`${baseUrl}/api/analysis/start`, {
    repositoryId: repository.id,
    mode: "demo",
  });
  const runId = startPayload.run?.id;
  assert(runId, "Analysis start did not return a run id.");

  const streamEventsPromise = collectSseEvents(
    `${baseUrl}/api/analysis/${runId}/stream`,
    60000,
  );
  const completedStatus = await waitForRunCompletion(runId, 60000);
  const streamEvents = await streamEventsPromise;

  assert(
    streamEvents.some((event) => event.type === "analysis.progress"),
    "Live stream did not emit analysis.progress.",
  );
  assert(
    streamEvents.some(
      (event) => event.type === "agent.turn" || event.type === "analysis.completed",
    ),
    "Live stream did not emit agent turn or completion events.",
  );
  assert(
    completedStatus.run.status === "completed",
    `Expected completed run, received ${completedStatus.run.status}.`,
  );
  assert(
    completedStatus.snapshotsCount > 0,
    "Completed run did not persist any checkpoints/snapshots.",
  );
  assert(
    completedStatus.reportsCount > 0,
    "Completed run did not persist any export reports.",
  );

  const reportContent = await downloadMarkdownReport(runId);
  assert(
    reportContent.includes("Analysis Report"),
    "Markdown report download did not return expected content.",
  );

  const reportArtifactPath = await verifyExportArtifactExists(runId, repository.name);
  console.log(`[verify] Export artifact persisted to ${reportArtifactPath}`);

  console.log("[verify] Creating a synthetic persisted checkpoint run");
  const synthetic = await createSyntheticCheckpointRun(runId);
  const resumeStreamPromise = collectSseEvents(
    `${baseUrl}/api/analysis/${synthetic.syntheticRunId}/stream`,
    60000,
  );
  await postJson(`${baseUrl}/api/analysis/${synthetic.syntheticRunId}/resume`, {});
  const resumedStatus = await waitForRunCompletion(synthetic.syntheticRunId, 60000);
  const resumeEvents = await resumeStreamPromise;

  assert(
    resumeEvents.some((event) => event.type === "analysis.progress"),
    "Resume verification did not emit analysis.progress.",
  );
  assert(
    resumeEvents.some(
      (event) => event.type === "agent.turn" || event.type === "analysis.completed",
    ),
    "Resume verification did not emit agent turn or completion events.",
  );
  assert(
    resumedStatus.run.status === "completed",
    `Resumed run did not complete successfully. Status: ${resumedStatus.run.status}.`,
  );
  assert(
    resumedStatus.turnsCount > synthetic.partialTurnsCount,
    "Resumed run did not advance beyond the persisted checkpoint.",
  );
  assert(
    resumedStatus.snapshotsCount >= synthetic.partialSnapshotsCount,
    "Resumed run lost persisted snapshots.",
  );
  assert(
    resumedStatus.reportsCount > 0,
    "Resumed run did not regenerate export reports.",
  );

  console.log(`[verify] Streaming, exports, and resume checks passed for ${baseUrl}`);
}

main()
  .catch((error) => {
    console.error(`[verify] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
