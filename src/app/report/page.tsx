import Link from "next/link";

import { ReportView } from "@/components/report/report-view";
import { Button } from "@/components/ui/button";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string }>;
}) {
  const { runId } = await searchParams;
  const bundle = await getLatestAnalysisBundle(runId);
  if (!bundle) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href={`/api/analysis/${bundle.run.id}/report?download=true`}>
          <Button variant="secondary">Export markdown report</Button>
        </Link>
      </div>
      <ReportView initialBundle={bundle} />
    </div>
  );
}
