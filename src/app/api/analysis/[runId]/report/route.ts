import { NextResponse } from "next/server";

import { getLatestAnalysisBundle } from "@/server/services/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return NextResponse.json({ error: "Analysis run not found." }, { status: 404 });
  }

  const report = bundle.reports[0];
  const url = new URL(request.url);
  const download = url.searchParams.get("download");

  if (download === "true" && report) {
    return new Response(report.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${bundle.repository.name}-report.md"`,
      },
    });
  }

  return NextResponse.json({ report });
}
