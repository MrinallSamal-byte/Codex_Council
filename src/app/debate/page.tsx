import { DebateView } from "@/components/debate/debate-view";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function DebatePage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return <DebateView initialBundle={bundle} />;
}
