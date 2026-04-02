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

  return NextResponse.json({ bundle });
}
