import type { AnalysisBundle } from "@/lib/contracts/domain";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function OverviewCards({ bundle }: { bundle: AnalysisBundle }) {
  const critical = bundle.findings.filter((finding) => finding.severity === "critical").length;
  const high = bundle.findings.filter((finding) => finding.severity === "high").length;
  const implementation = bundle.findings.filter(
    (finding) => finding.category === "implementation",
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-semibold text-white">{bundle.findings.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Critical + High</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="text-4xl font-semibold text-white">{critical + high}</div>
          <Badge variant={critical > 0 ? "critical" : "high"}>
            {critical > 0 ? "Critical pressure" : "High pressure"}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Implementation gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-semibold text-white">{implementation}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Feature opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-semibold text-white">{bundle.features.length}</div>
        </CardContent>
      </Card>
    </div>
  );
}
