import { NextResponse } from "next/server";

import { ImportRepoRequestSchema } from "@/lib/contracts/api";
import { importDemoRepository, importGitRepository } from "@/server/repos/ingest";
import { listRepositories } from "@/server/services/queries";

export async function GET() {
  const repositories = await listRepositories();
  return NextResponse.json({ repositories });
}

export async function POST(request: Request) {
  try {
    const payload = ImportRepoRequestSchema.parse(await request.json());
    const repository = payload.useDemo
      ? await importDemoRepository()
      : payload.gitUrl
        ? await importGitRepository(payload.gitUrl)
        : null;

    if (!repository) {
      return NextResponse.json(
        { error: "Provide either a GitHub URL or useDemo=true." },
        { status: 400 },
      );
    }

    return NextResponse.json({ repository });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repository import failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
