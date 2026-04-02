import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);

  if (!bundle) {
    return null;
  }

  return <DashboardView initialBundle={bundle} />;
}
