import Link from "next/link";
import { ArrowRight, Cable, ShieldCheck, Sparkles } from "lucide-react";

import { RepoImportForm } from "@/components/landing/repo-import-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex items-center justify-between rounded-[28px] border border-white/10 bg-slate-950/50 px-6 py-4 backdrop-blur-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">RepoCouncil</p>
            <h1 className="mt-2 text-lg font-semibold text-white">Codebase command center</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary">Open dashboard</Button>
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-8 backdrop-blur-sm">
            <Badge>Multi-agent architecture intelligence</Badge>
            <h2 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-white">
              Ingest a repository, map the real architecture, run a structured debate, and keep every finding durable.
            </h2>
            <p className="mt-5 max-w-3xl text-lg text-slate-300">
              RepoCouncil combines JS/TS repository analysis, security and implementation gap detection,
              LangGraph-backed debate orchestration, and a live visual graph so you can inspect what
              the system is connected to and what needs fixing first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Explore the command center
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#import">
                <Button size="lg" variant="secondary">
                  Connect a repository
                </Button>
              </a>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <FeatureBlurb
                icon={Cable}
                title="Live architecture graph"
                description="Routes, services, models, jobs, and external APIs rendered as a navigable dependency map."
              />
              <FeatureBlurb
                icon={ShieldCheck}
                title="Evidence-first audit"
                description="Security, implementation, and maintainability findings tied back to files, symbols, and line ranges."
              />
              <FeatureBlurb
                icon={Sparkles}
                title="Multi-agent synthesis"
                description="Scout, Architect, Security, Implementation, Product, and Judge turns persisted with resumable memory."
              />
            </div>
          </section>

          <section id="import" className="space-y-6">
            <RepoImportForm />
            <Card className="border-white/10 bg-slate-950/75">
              <CardHeader>
                <CardTitle>What the MVP already supports</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-300">
                <p>1. Public GitHub repo import and local zip upload.</p>
                <p>2. JS/TS architecture mapping from imports and route handlers.</p>
                <p>3. LangGraph-backed multi-agent debate with persisted snapshots.</p>
                <p>4. Live SSE progress, React Flow graphing, TanStack findings tables, and Monaco patch previews.</p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

function FeatureBlurb({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Cable;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}
