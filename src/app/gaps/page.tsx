import { FindingsView } from "@/components/findings/findings-view";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function GapsPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return <FindingsView initialBundle={bundle} category="implementation" />;
}
