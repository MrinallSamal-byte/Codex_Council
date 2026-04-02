import { NextResponse } from "next/server";

import { getLatestAnalysisBundle } from "@/server/services/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const bundle = await getLatestAnalysisBundle(runId);

  if (!bundle) {
    return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
  }

  return NextResponse.json({
    run: bundle.run,
    summary: bundle.run.summary,
    findingsCount: bundle.findings.length,
    turnsCount: bundle.turns.length,
    snapshotsCount: bundle.snapshots.length,
    reportsCount: bundle.reports.length,
    canResume:
      bundle.run.status !== "completed" &&
      !bundle.turns.some((turn) => turn.agentName === "judge"),
    latestTurnAt: bundle.turns.at(-1)?.createdAt ?? null,
    latestSnapshotAt: bundle.snapshots.at(-1)?.createdAt ?? null,
  });
}
