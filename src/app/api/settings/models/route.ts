import { NextResponse } from "next/server";

import { UpdateModelSettingsRequestSchema } from "@/lib/contracts/api";
import { getStorageAdapter } from "@/server/db";
import { getDefaultModelSettings } from "@/server/models/defaults";
import { verifyModelSettings } from "@/server/models/verify";

export async function GET() {
  const storage = getStorageAdapter();
  const settings = await storage.listModelSettings();
  const effectiveSettings = settings.length > 0 ? settings : getDefaultModelSettings();
  return NextResponse.json({
    settings: effectiveSettings,
    verification: verifyModelSettings(effectiveSettings),
  });
}

export async function POST(request: Request) {
  const payload = UpdateModelSettingsRequestSchema.parse(await request.json());
  const storage = getStorageAdapter();
  const settings = await storage.upsertModelSettings(payload.settings);
  return NextResponse.json({
    settings,
    verification: verifyModelSettings(settings),
  });
}
