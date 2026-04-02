import { PatchesView } from "@/components/patches/patches-view";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function PatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return <PatchesView initialBundle={bundle} />;
}
