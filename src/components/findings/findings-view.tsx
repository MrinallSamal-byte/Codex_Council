"use client";

import type { AnalysisBundle, FindingCategory } from "@/lib/contracts/domain";
import { titleCase } from "@/lib/utils";

import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { FindingsTable } from "./findings-table";

export function FindingsView({
  initialBundle,
  category,
}: {
  initialBundle: AnalysisBundle;
  category: FindingCategory | "all";
}) {
  const { bundle } = useLiveAnalysisBundle(initialBundle);

  if (!bundle) {
    return null;
  }

  const findings =
    category === "all"
      ? bundle.findings
      : bundle.findings.filter((finding) => finding.category === category);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {category === "all" ? "All findings" : `${titleCase(category)} findings`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FindingsTable findings={findings} />
      </CardContent>
    </Card>
  );
}
