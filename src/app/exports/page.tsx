import Link from "next/link";
import { Download, FileArchive, FileJson, FileText, FileType2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { getLatestAnalysisBundle, getLatestAskSessionBundle } from "@/server/services/queries";

export default async function ExportsPage() {
  const [analysisBundle, askBundle] = await Promise.all([
    getLatestAnalysisBundle(),
    getLatestAskSessionBundle(),
  ]);
  const analysisArtifacts = [...(analysisBundle?.reports ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const askArtifacts = [...(askBundle?.exports ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.92))] p-7">
        <h1 className="text-4xl font-semibold text-white">Exports</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Download codebase reports and Ask Mode council sessions from one place.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Codebase Exports</CardTitle>
            <CardDescription>
              Latest analysis report for {analysisBundle?.repository.name ?? "the current repository"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExportItem
              title="Markdown report"
              description="Executive report with findings, feature suggestions, and judge summary."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=markdown&download=true` : "#"}
              icon={FileText}
              disabled={!analysisBundle}
            />
            <ExportItem
              title="Structured JSON"
              description="Full persisted bundle for downstream automation or archival."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=json&download=true` : "#"}
              icon={FileJson}
              disabled={!analysisBundle}
            />
            <ExportItem
              title="Findings CSV"
              description="Flat findings export for spreadsheets and triage workflows."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=csv&download=true` : "#"}
              icon={FileText}
              disabled={!analysisBundle}
            />
            <ExportItem
              title="Mermaid graph"
              description="Architecture graph export for docs and technical reviews."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=mermaid&download=true` : "#"}
              icon={FileText}
              disabled={!analysisBundle}
            />
            <ExportItem
              title="PDF summary"
              description="Portable executive summary for offline review."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=pdf&download=true` : "#"}
              icon={FileType2}
              disabled={!analysisBundle}
            />
            <ExportItem
              title="ZIP bundle"
              description="Complete bundle with status report, findings, graph, transcript, and next plan."
              href={analysisBundle ? `/api/analysis/${analysisBundle.run.id}/report?format=zip&download=true` : "#"}
              icon={FileArchive}
              disabled={!analysisBundle}
            />
            <ArtifactHistory
              title="Generated analysis artifacts"
              artifacts={analysisArtifacts.map((artifact) => ({
                id: artifact.id,
                label: `${artifact.format.toUpperCase()} · ${artifact.title}`,
                createdAt: artifact.createdAt,
              }))}
            />
            <Link href="/report">
              <Button variant="secondary">Open report view</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ask Mode Exports</CardTitle>
            <CardDescription>
              Latest council session: {askBundle?.session.title ?? "No session yet"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExportItem
              title="Final answer markdown"
              description="Synthesized answer with supporting viewpoints and action plan."
              href={askBundle ? `/api/ask/sessions/${askBundle.session.id}/exports?format=markdown&download=true` : "#"}
              icon={FileText}
              disabled={!askBundle}
            />
            <ExportItem
              title="Structured JSON"
              description="Complete session payload, assignments, and turn history."
              href={askBundle ? `/api/ask/sessions/${askBundle.session.id}/exports?format=json&download=true` : "#"}
              icon={FileJson}
              disabled={!askBundle}
            />
            <ExportItem
              title="PDF summary"
              description="Portable summary for sharing outside the app."
              href={askBundle ? `/api/ask/sessions/${askBundle.session.id}/exports?format=pdf&download=true` : "#"}
              icon={FileType2}
              disabled={!askBundle}
            />
            <ExportItem
              title="ZIP bundle"
              description="Markdown, transcript, JSON, and PDF together."
              href={askBundle ? `/api/ask/sessions/${askBundle.session.id}/exports?format=zip&download=true` : "#"}
              icon={FileArchive}
              disabled={!askBundle}
            />
            <ArtifactHistory
              title="Generated Ask artifacts"
              artifacts={askArtifacts.map((artifact) => ({
                id: artifact.id,
                label: `${artifact.format.toUpperCase()} · ${artifact.title}`,
                createdAt: artifact.createdAt,
              }))}
            />
            <Link href="/ask">
              <Button variant="secondary">Open Ask Mode</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExportItem({
  title,
  description,
  href,
  icon: Icon,
  disabled,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof FileText;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/80 p-2">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <Button asChild variant="secondary" disabled={disabled}>
        <a href={href}>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

function ArtifactHistory({
  title,
  artifacts,
}: {
  title: string;
  artifacts: Array<{ id: string; label: string; createdAt: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {artifacts.length > 0 ? (
          artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm"
            >
              <span className="text-slate-200">{artifact.label}</span>
              <span className="text-xs text-slate-500">{formatDateTime(artifact.createdAt)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No artifacts generated yet.</p>
        )}
      </div>
    </div>
  );
}
