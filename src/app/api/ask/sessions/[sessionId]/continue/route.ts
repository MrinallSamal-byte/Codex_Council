import { NextResponse } from "next/server";

import { ContinueAskSessionRequestSchema } from "@/lib/contracts/api";
import { continueAskSession } from "@/server/council/run-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  try {
    const payload = ContinueAskSessionRequestSchema.parse(await request.json());
    const session = await continueAskSession(sessionId, payload);

    if (!session) {
      return NextResponse.json({ error: "Ask session not found." }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 500;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to continue ask session.",
      },
      { status },
    );
  }
}
