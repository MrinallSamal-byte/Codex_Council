import { NextResponse } from "next/server";

import { resumeAskSession } from "@/server/council/run-session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  try {
    const session = await resumeAskSession(sessionId);
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
        error: error instanceof Error ? error.message : "Unable to resume ask session.",
      },
      { status },
    );
  }
}
