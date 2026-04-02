import { NextResponse } from "next/server";

import { getLatestAnalysisBundle } from "@/server/services/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string; analyzer: string }> },
) {
  const { runId, analyzer } = await params;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
  }

  return NextResponse.json({
    analyzer,
    status: "queued",
    message:
      "Analyzer rerun endpoint is available; in the MVP it returns the latest persisted state while the broader analyzer queue stays in-process.",
    bundle,
  });
}
