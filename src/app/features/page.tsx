import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function FeaturesPage({
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
    <div className="grid gap-6 xl:grid-cols-2">
      {bundle.features.slice(0, 5).map((feature) => (
        <Card key={feature.id}>
          <CardHeader>
            <div className="mb-3 flex items-center justify-between gap-3">
              <CardTitle>{feature.title}</CardTitle>
              <Badge variant="secondary">{feature.effort}</Badge>
            </div>
            <CardDescription>{feature.value}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>{feature.rationale}</p>
            <div className="flex flex-wrap gap-2">
              {feature.impactedModules.map((module) => (
                <Badge key={module} variant="secondary">
                  {module}
                </Badge>
              ))}
            </div>
            <p>
              <span className="font-medium text-white">Risk:</span> {feature.risk}
            </p>
            <p>
              <span className="font-medium text-white">Dependency impact:</span>{" "}
              {feature.dependencyImpact}
            </p>
            <p>
              <span className="font-medium text-white">Security:</span> {feature.securityNotes}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
