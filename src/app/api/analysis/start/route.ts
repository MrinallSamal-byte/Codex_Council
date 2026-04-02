import { NextResponse } from "next/server";

import { StartAnalysisRequestSchema } from "@/lib/contracts/api";
import { startAnalysisForRepository } from "@/server/orchestration/run-analysis";
import { getRepositoryOrThrow } from "@/server/repos/ingest";

export async function POST(request: Request) {
  try {
    const payload = StartAnalysisRequestSchema.parse(await request.json());
    const repository = await getRepositoryOrThrow(payload.repositoryId);
    const workspacePath = String(repository.metadata.workspacePath ?? "");

    if (!workspacePath) {
      return NextResponse.json(
        { error: "Repository workspace path is missing." },
        { status: 400 },
      );
    }

    const run = await startAnalysisForRepository({
      repository,
      workspacePath,
      mode: payload.mode,
    });

    return NextResponse.json({ run });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start the analysis run.",
      },
      { status },
    );
  }
}
