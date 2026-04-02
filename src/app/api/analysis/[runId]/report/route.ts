import { NextResponse } from "next/server";

import { GetAnalysisExportRequestSchema } from "@/lib/contracts/api";
import { getStorageAdapter } from "@/server/db";
import {
  buildAnalysisExportArtifact,
  resolveAnalysisArtifactPayload,
} from "@/server/report/export";
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

  const url = new URL(request.url);
  const parsed = GetAnalysisExportRequestSchema.parse({
    format: url.searchParams.get("format") ?? "markdown",
    download: url.searchParams.get("download") === "true",
  });

  const artifact = await buildAnalysisExportArtifact(bundle, parsed.format);
  await getStorageAdapter().saveReport(bundle.run.id, artifact);

  if (parsed.download) {
    const payload = resolveAnalysisArtifactPayload(bundle, artifact);
    return new Response(payload.content, {
      headers: {
        "Content-Type": payload.mimeType,
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
      },
    });
  }

  return NextResponse.json({ artifact });
}
