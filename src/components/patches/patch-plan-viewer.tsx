"use client";

import dynamic from "next/dynamic";

import type { PatchPlan } from "@/lib/contracts/domain";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const DiffEditor = dynamic(
  async () => (await import("@monaco-editor/react")).DiffEditor,
  { ssr: false },
);

export function PatchPlanViewer({ patches }: { patches: PatchPlan[] }) {
  return (
    <div className="space-y-6">
      {patches.map((patch) => (
        <Card key={patch.id}>
          <CardHeader>
            <div className="mb-2 flex items-center justify-between gap-3">
              <CardTitle>{patch.title}</CardTitle>
              <Badge variant="secondary">{Math.round(patch.confidence * 100)}% confidence</Badge>
            </div>
            <CardDescription>{patch.whyItMatters}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Root cause
                </p>
                <p className="text-sm text-slate-300">{patch.rootCause}</p>
                <div className="mt-4 space-y-2">
                  {patch.recommendedSteps.map((step) => (
                    <div key={step} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-200">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Files affected
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {patch.filesAffected.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </div>
            </div>
            {patch.draftPatch ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <DiffEditor
                  height="320px"
                  language="typescript"
                  original="// Original patch not generated in MVP mode"
                  modified={patch.draftPatch}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    renderSideBySide: false,
                  }}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
