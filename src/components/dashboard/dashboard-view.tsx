"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, ShieldAlert, Sparkles } from "lucide-react";

import type { AnalysisBundle } from "@/lib/contracts/domain";

import { SeverityChart } from "../charts/severity-chart";
import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { OverviewCards } from "./overview-cards";

export function DashboardView({ initialBundle }: { initialBundle: AnalysisBundle }) {
  const { bundle, progress } = useLiveAnalysisBundle(initialBundle);

  if (!bundle) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
              Active repository
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{bundle.repository.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {bundle.repository.sourceType} import · thread {bundle.run.threadId}
            </p>
          </div>
          <Badge variant="secondary">{bundle.run.status}</Badge>
        </div>
        <div className="max-w-xl space-y-2">
          <Progress value={progress.percent} />
          <p className="text-sm text-slate-400">{progress.message}</p>
        </div>
      </div>

      <OverviewCards bundle={bundle} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Severity pressure</CardTitle>
            <CardDescription>
              Live count of findings by severity from the current run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeverityChart findings={bundle.findings} />
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top modules at risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bundle.findings.slice(0, 4).map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge variant={finding.severity}>{finding.severity}</Badge>
                    <span className="text-xs text-slate-500">{finding.filePath ?? "No path"}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{finding.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick jumps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <QuickJump href="/security" icon={ShieldAlert} label="Review security findings" />
              <QuickJump href="/architecture" icon={GitBranch} label="Inspect architecture graph" />
              <QuickJump href="/features" icon={Sparkles} label="See five feature bets" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickJump({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ShieldAlert;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.04]"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-cyan-300" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-slate-500" />
    </Link>
  );
}
