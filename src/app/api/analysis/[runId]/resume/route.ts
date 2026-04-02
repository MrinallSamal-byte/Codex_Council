import { NextResponse } from "next/server";

import { resumeAnalysisRun } from "@/server/orchestration/run-analysis";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const bundle = await resumeAnalysisRun(runId);
    if (!bundle) {
      return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
    }

    return NextResponse.json({
      resumed: true,
      bundle,
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to resume the analysis run.",
      },
      { status },
    );
  }
}
