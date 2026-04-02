import { NextResponse } from "next/server";

import { getStorageAdapter } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const storage = getStorageAdapter();
  const bundle = await storage.getAskSessionBundle(sessionId);

  if (!bundle) {
    return NextResponse.json({ error: "Ask session not found." }, { status: 404 });
  }

  return NextResponse.json({ bundle });
}
