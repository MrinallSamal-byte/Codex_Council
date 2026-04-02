import { NextResponse } from "next/server";

import { getStorageAdapter } from "@/server/db";
import { buildMarkdownReport, ensureMarkdownReportArtifact } from "@/server/report/export";
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

  let effectiveReport = report;
  if (!effectiveReport) {
    const generatedReport = {
      id: `report_${bundle.run.id}`,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} analysis report`,
      format: "markdown" as const,
      content: buildMarkdownReport(bundle),
      createdAt: new Date().toISOString(),
    };
    await getStorageAdapter().saveReport(bundle.run.id, generatedReport);
    effectiveReport = generatedReport;
  }

  if (download === "true" && effectiveReport) {
    const artifact = await ensureMarkdownReportArtifact({
      bundle: {
        ...bundle,
        reports: [effectiveReport],
      },
      reportContent: effectiveReport.content,
    });
    return new Response(artifact.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
      },
    });
  }

  return NextResponse.json({ report: effectiveReport });
}
