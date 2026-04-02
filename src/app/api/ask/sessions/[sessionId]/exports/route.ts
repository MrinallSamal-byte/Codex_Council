import { NextResponse } from "next/server";

import { GetAskExportRequestSchema } from "@/lib/contracts/api";
import {
  buildAskExportArtifact,
  isAskExportArtifactStale,
  resolveAskArtifactPayload,
} from "@/server/council/export";
import { getStorageAdapter } from "@/server/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const storage = getStorageAdapter();
  const bundle = await storage.getAskSessionBundle(sessionId);

  if (!bundle) {
    return NextResponse.json({ error: "Ask session not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = GetAskExportRequestSchema.parse({
    format: url.searchParams.get("format") ?? "markdown",
    download: url.searchParams.get("download") === "true",
  });
  const { format, download } = parsed;

  const existingArtifact = bundle.exports.find((artifact) => artifact.format === format);
  const artifact =
    !existingArtifact || isAskExportArtifactStale(bundle, existingArtifact)
      ? await buildAskExportArtifact(bundle, format)
      : existingArtifact;

  if (!existingArtifact || isAskExportArtifactStale(bundle, existingArtifact)) {
    await storage.saveAskExport(sessionId, artifact);
  }

  if (!download) {
    return NextResponse.json({ artifact });
  }

  const payload = resolveAskArtifactPayload(artifact);
  return new Response(payload.content, {
    headers: {
      "Content-Type": payload.mimeType,
      "Content-Disposition": `attachment; filename="${payload.filename}"`,
    },
  });
}
