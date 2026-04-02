import { NextResponse } from "next/server";

import { getDebateState } from "@/server/services/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const state = await getDebateState(runId);
  return NextResponse.json({ state });
}
