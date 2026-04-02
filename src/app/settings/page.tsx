import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runtimeCapabilities } from "@/env";
import { ModelSettingsForm } from "@/components/settings/model-settings-form";
import { getStorageAdapter } from "@/server/db";
import { getDefaultModelSettings } from "@/server/models/defaults";
import { verifyModelSettings } from "@/server/models/verify";

export default async function SettingsPage() {
  const storage = getStorageAdapter();
  const settings = await storage.listModelSettings();
  const effectiveSettings = settings.length > 0 ? settings : getDefaultModelSettings();

  return (
    <div className="space-y-6">
      <ModelSettingsForm
        initialSettings={effectiveSettings}
        initialVerification={verifyModelSettings(effectiveSettings)}
      />
      <Card>
        <CardHeader>
          <CardTitle>Council runtime</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Max participants
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {runtimeCapabilities.askMaxParticipants}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Active agents per round
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {runtimeCapabilities.askMaxActiveAgents}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Concurrent sessions
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {runtimeCapabilities.askMaxConcurrency}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
