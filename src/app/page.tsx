import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Cable,
  GitBranchPlus,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

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
            <h1 className="mt-2 text-lg font-semibold text-white">Multi-agent intelligence workspace</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="secondary">Open dashboard</Button>
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-8 backdrop-blur-sm">
            <Badge>Code intelligence + debated answers</Badge>
            <h2 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-white">
              Analyze software projects or ask the AI Council any question with the number of agents you want behind the answer.
            </h2>
            <p className="mt-5 max-w-3xl text-lg text-slate-300">
              RepoCouncil combines architecture mapping, security and implementation analysis, live debate orchestration,
              durable memory, and exportable sessions so the platform feels more like an interactive intelligence chamber
              than another generic chatbot or static audit tool.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/codebase">
                <Button size="lg">
                  Analyze a codebase
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/ask">
                <Button size="lg" variant="secondary">
                  Ask the AI Council
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <FeatureBlurb
                icon={Cable}
                title="Codebase Mode"
                description="Import a repository, map architecture, detect issues, propose fixes, and export reports."
              />
              <FeatureBlurb
                icon={UsersRound}
                title="Ask Mode"
                description="Run a fast single-model answer or a multi-agent council with critique, refinement, and synthesis."
              />
              <FeatureBlurb
                icon={BrainCircuit}
                title="Transparent Routing"
                description="See which agent used which model and provider, whether fallback happened, and export the full debate."
              />
            </div>
          </section>

          <section id="import" className="space-y-6">
            <div className="grid gap-6">
              <DualModeCard
                href="/codebase"
                icon={GitBranchPlus}
                title="Analyze a Codebase"
                description="Architecture graphs, issue detection, patch plans, and durable technical reports."
                cta="Open Codebase Mode"
              />
              <DualModeCard
                href="/ask"
                icon={Sparkles}
                title="Ask the AI Council"
                description="General questions, planning, coding help, study, brainstorming, and decision support with agent-count control."
                cta="Open Ask Mode"
              />
            </div>
            <Card className="border-white/10 bg-slate-950/75">
              <CardHeader>
                <CardTitle>Why this feels different</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-300">
                <p>1. Two primary paths from the same product: Codebase Mode and Ask Mode.</p>
                <p>2. User-controlled 1-6 agent runs with structured debate instead of repetitive fan-out.</p>
                <p>3. Durable memory, transparent model/provider badges, and exportable sessions.</p>
                <p>4. Live progress, visual boards, and a more engaging “council chamber” feel than a plain chat wrapper.</p>
              </CardContent>
            </Card>
          </section>
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <RepoImportForm />
          <Card className="border-white/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle>Two distinct paths from the same platform</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <ModePanel
                icon={ShieldCheck}
                title="Codebase Intelligence"
                points={[
                  "Import GitHub repos or local snapshots.",
                  "Map architecture, risks, and missing implementation.",
                  "Run persisted multi-agent code review and export findings.",
                ]}
              />
              <ModePanel
                icon={Sparkles}
                title="Debated Answers"
                points={[
                  "Ask normal questions, planning prompts, coding questions, or comparisons.",
                  "Choose normal, debate, or deep council generation.",
                  "Watch the agent board think in rounds and export the result.",
                ]}
              />
            </CardContent>
          </Card>
        </section>
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

function DualModeCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 transition hover:border-cyan-400/20 hover:bg-slate-950/85"
    >
      <Icon className="h-6 w-6 text-cyan-300" />
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-cyan-200">
        <span>{cta}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function ModePanel({
  icon: Icon,
  title,
  points,
}: {
  icon: typeof ShieldCheck;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <Icon className="h-5 w-5 text-cyan-300" />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {points.map((point) => (
          <p key={point} className="text-sm text-slate-300">
            {point}
          </p>
        ))}
      </div>
    </div>
  );
}
