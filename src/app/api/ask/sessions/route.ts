import { NextResponse } from "next/server";

import { runtimeCapabilities } from "@/env";
import { CreateAskSessionRequestSchema } from "@/lib/contracts/api";
import { startAskSession } from "@/server/council/run-session";
import { getStorageAdapter } from "@/server/db";

export async function GET() {
  const storage = getStorageAdapter();
  const sessions = await storage.listAskSessions(25);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  try {
    const payload = CreateAskSessionRequestSchema.parse(await request.json());

    if (payload.agentCount > runtimeCapabilities.askMaxParticipants) {
      return NextResponse.json(
        {
          error: `This deployment allows up to ${runtimeCapabilities.askMaxParticipants} agents per answer.`,
        },
        { status: 400 },
      );
    }

    const session = await startAskSession(payload);
    return NextResponse.json({ session });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 500;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start ask session.",
      },
      { status },
    );
  }
}
