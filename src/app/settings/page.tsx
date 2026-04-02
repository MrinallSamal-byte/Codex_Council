import { ModelSettingsForm } from "@/components/settings/model-settings-form";
import { getStorageAdapter } from "@/server/db";
import { getDefaultModelSettings } from "@/server/models/defaults";
import { verifyModelSettings } from "@/server/models/verify";

export default async function SettingsPage() {
  const storage = getStorageAdapter();
  const settings = await storage.listModelSettings();
  const effectiveSettings = settings.length > 0 ? settings : getDefaultModelSettings();

  return (
    <ModelSettingsForm
      initialSettings={effectiveSettings}
      initialVerification={verifyModelSettings(effectiveSettings)}
    />
  );
}
