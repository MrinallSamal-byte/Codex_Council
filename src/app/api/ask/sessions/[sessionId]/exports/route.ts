import { NextResponse } from "next/server";

import type { AskExport } from "@/lib/contracts/domain";
import { buildAskExportArtifact, resolveAskArtifactPayload } from "@/server/council/export";
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
  const format = (url.searchParams.get("format") ?? "markdown") as AskExport["format"];
  const download = url.searchParams.get("download") === "true";

  const existingArtifact = bundle.exports.find((artifact) => artifact.format === format);
  const artifact = existingArtifact ?? (await buildAskExportArtifact(bundle, format));

  if (!existingArtifact) {
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
