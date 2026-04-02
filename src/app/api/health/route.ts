import { NextResponse } from "next/server";

import { getHealthSnapshot } from "@/server/runtime/health";

export async function GET() {
  const snapshot = await getHealthSnapshot();
  return NextResponse.json(snapshot, { status: 200 });
}
