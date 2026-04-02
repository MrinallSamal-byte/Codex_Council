"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { AnalysisBundle } from "@/lib/contracts/domain";

import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DebateTimeline } from "./debate-timeline";

export function DebateView({ initialBundle }: { initialBundle: AnalysisBundle }) {
  const { bundle, progress, replaceBundle } = useLiveAnalysisBundle(initialBundle);
  const activeBundle = bundle ?? initialBundle;
  const [selectedTurnId, setSelectedTurnId] = useState(initialBundle.turns.at(-1)?.id);
  const [isPending, startTransition] = useTransition();

  const latestSnapshot = activeBundle.snapshots.at(-1);
  const selectedTurn =
    activeBundle.turns.find((turn) => turn.id === selectedTurnId) ??
    activeBundle.turns.at(-1);
  const canResume = !activeBundle.turns.some((turn) => turn.agentName === "judge");
  const findingsByCategory = Object.entries(
    latestSnapshot?.canonicalState.findingsByCategory ?? {},
  );

  useEffect(() => {
    if (!activeBundle.turns.length) {
      return;
    }

    if (
      !selectedTurnId ||
      !activeBundle.turns.some((turn) => turn.id === selectedTurnId)
    ) {
      setSelectedTurnId(activeBundle.turns.at(-1)?.id);
    }
  }, [activeBundle.turns, selectedTurnId]);

  const selectedTurnOutput = useMemo(
    () => (selectedTurn ? JSON.stringify(selectedTurn.outputJson, null, 2) : null),
    [selectedTurn],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_380px]">
      <DebateTimeline
        turns={activeBundle.turns}
        selectedTurnId={selectedTurn?.id}
        onSelectTurn={setSelectedTurnId}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Debate state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>{progress.message}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{activeBundle.turns.length} turns</Badge>
              <Badge variant="secondary">{activeBundle.snapshots.length} snapshots</Badge>
              <Badge variant="secondary">{progress.percent}%</Badge>
            </div>
            <p>{latestSnapshot?.summaryText ?? "No snapshot summary yet."}</p>
            {canResume ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const response = await fetch(`/api/analysis/${activeBundle.run.id}/resume`, {
                      method: "POST",
                    });
                    if (!response.ok) {
                      return;
                    }
                    const payload = (await response.json()) as { bundle: AnalysisBundle };
                    replaceBundle(payload.bundle);
                  })
                }
              >
                {isPending ? "Resuming..." : "Resume debate"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Persisted state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <StateList
              title="Agreed points"
              items={latestSnapshot?.canonicalState.finalAgreedPoints ?? []}
              emptyLabel="No final agreed points yet."
            />
            <StateList
              title="Rejected hypotheses"
              items={latestSnapshot?.canonicalState.rejectedHypotheses ?? []}
              emptyLabel="No rejected hypotheses yet."
            />
            <StateList
              title="Next tools"
              items={latestSnapshot?.canonicalState.nextRecommendedTools ?? []}
              emptyLabel="No follow-up tools queued."
            />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Findings by category
              </p>
              {findingsByCategory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {findingsByCategory.map(([category, findingIds]) => (
                    <Badge key={category} variant="secondary">
                      {category}: {findingIds.length}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No categorized findings yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contradictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(latestSnapshot?.canonicalState.contradictions ?? []).map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(latestSnapshot?.canonicalState.openQuestions ?? []).map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Selected turn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTurn ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedTurn.agentName}</Badge>
                  <Badge variant="secondary">{selectedTurn.provider}</Badge>
                  <Badge variant="secondary">{selectedTurn.model}</Badge>
                </div>
                <p className="text-sm text-slate-300">{selectedTurn.inputSummary}</p>
                {(selectedTurn.metadata?.attempts ?? []).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Model attempts
                    </p>
                    {(selectedTurn.metadata?.attempts ?? []).map((attempt, index) => (
                      <div
                        key={`${attempt.model}_${index}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-300"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              attempt.status === "success"
                                ? "low"
                                : attempt.status === "heuristic_fallback"
                                  ? "high"
                                  : "medium"
                            }
                          >
                            {attempt.status}
                          </Badge>
                          <span>{attempt.model}</span>
                        </div>
                        {attempt.error ? (
                          <p className="mt-2 text-slate-500">{attempt.error}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <pre className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/80 p-4 text-xs text-slate-300">
                  {selectedTurnOutput}
                </pre>
              </>
            ) : (
              <p className="text-sm text-slate-500">No persisted turns yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StateList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      {items.length > 0 ? (
        items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-300"
          >
            {item}
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}
