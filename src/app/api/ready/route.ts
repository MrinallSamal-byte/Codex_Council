import { NextResponse } from "next/server";

import { getReadinessSnapshot } from "@/server/runtime/health";

export async function GET() {
  const snapshot = await getReadinessSnapshot();
  return NextResponse.json(snapshot, {
    status: snapshot.status === "ready" ? 200 : 503,
  });
}
