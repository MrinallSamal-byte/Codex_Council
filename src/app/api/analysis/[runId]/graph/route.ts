import { NextResponse } from "next/server";

import { getGraph } from "@/server/services/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const graph = await getGraph(runId);
  return NextResponse.json(graph);
}
