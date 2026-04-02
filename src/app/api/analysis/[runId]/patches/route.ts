import { NextResponse } from "next/server";

import { getStorageAdapter } from "@/server/db";
import { buildPatchPlans } from "@/server/patches/planner";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const bundle = await getLatestAnalysisBundle(runId);
  return NextResponse.json({ patches: bundle?.patches ?? [] });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const storage = getStorageAdapter();
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
  }

  const patches = buildPatchPlans(runId, bundle.findings);
  await storage.savePatches(runId, patches);
  return NextResponse.json({ patches });
}
