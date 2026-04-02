import { NextResponse } from "next/server";

import { getFindings } from "@/server/services/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const findings = await getFindings(runId, category);
  return NextResponse.json({ findings });
}
