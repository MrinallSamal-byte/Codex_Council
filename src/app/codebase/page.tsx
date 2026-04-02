import Link from "next/link";
import { ArrowRight, Cable, ShieldCheck, Sparkles } from "lucide-react";

import { RepoImportForm } from "@/components/landing/repo-import-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestAnalysisBundle } from "@/server/services/queries";

export default async function CodebasePage() {
  const bundle = await getLatestAnalysisBundle();

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.92))] p-7">
        <Badge>Codebase Mode</Badge>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white">
          Import a repository, map the architecture, run structured review, and export the council’s technical judgment.
        </h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          This is the software intelligence side of RepoCouncil: architecture graphs, issue detection,
          multi-agent code review, feature suggestions, patch plans, and durable reports.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button>
              Open latest analysis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/ask">
            <Button variant="secondary">Switch to Ask Mode</Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <RepoImportForm />
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Latest codebase run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p className="text-lg font-medium text-white">{bundle?.repository.name ?? "No repository yet"}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{bundle?.run.status ?? "idle"}</Badge>
                <Badge variant="secondary">{bundle?.findings.length ?? 0} findings</Badge>
                <Badge variant="secondary">{bundle?.graph.nodes.length ?? 0} graph nodes</Badge>
                <Badge variant="secondary">{bundle?.turns.length ?? 0} turns</Badge>
              </div>
              <p>
                {bundle?.turns.at(-1)?.outputJson.summary
                  ? String(bundle.turns.at(-1)?.outputJson.summary)
                  : "Import a repository to populate the architecture graph and debate artifacts."}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <QuickCard
                  icon={Cable}
                  title="Architecture"
                  text="Trace routes, services, models, jobs, and external dependencies."
                />
                <QuickCard
                  icon={ShieldCheck}
                  title="Issues"
                  text="Review security, implementation, maintainability, and feature gaps."
                />
                <QuickCard
                  icon={Sparkles}
                  title="Outputs"
                  text="Export markdown reports, patch plans, and council-backed summaries."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Cable;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}
