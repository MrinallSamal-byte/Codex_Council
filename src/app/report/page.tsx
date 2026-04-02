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
      <div className="flex justify-end gap-3">
        <Link href={`/api/analysis/${bundle.run.id}/report?format=markdown&download=true`}>
          <Button variant="secondary">Export markdown report</Button>
        </Link>
        <Link href={`/api/analysis/${bundle.run.id}/report?format=zip&download=true`}>
          <Button variant="secondary">Download ZIP bundle</Button>
        </Link>
      </div>
      <ReportView initialBundle={bundle} />
    </div>
  );
}
