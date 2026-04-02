import { ArchitectureView } from "@/components/graphs/architecture-view";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function ArchitecturePage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return <ArchitectureView initialBundle={bundle} />;
}
