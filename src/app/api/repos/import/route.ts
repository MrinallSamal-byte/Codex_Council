import { NextResponse } from "next/server";

import { importDemoRepository, importGitRepository, importZipRepository } from "@/server/repos/ingest";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as { gitUrl?: string; useDemo?: boolean };
      const repository = payload.useDemo
        ? await importDemoRepository()
        : payload.gitUrl
          ? await importGitRepository(payload.gitUrl)
          : null;

      if (!repository) {
        return NextResponse.json(
          { error: "Provide either a gitUrl or useDemo=true." },
          { status: 400 },
        );
      }

      return NextResponse.json({ repository });
    }

    const formData = await request.formData();
    const file = formData.get("archive");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing zip archive." }, { status: 400 });
    }

    const repository = await importZipRepository(file.name, await file.arrayBuffer());
    return NextResponse.json({ repository });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repository import failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
