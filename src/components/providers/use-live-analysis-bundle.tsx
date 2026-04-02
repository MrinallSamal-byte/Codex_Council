"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AnalysisBundle } from "@/lib/contracts/domain";

type ProgressState = {
  message: string;
  percent: number;
};

export function useLiveAnalysisBundle(initialBundle: AnalysisBundle | null) {
  const [bundle, setBundle] = useState(initialBundle);
  const [progress, setProgress] = useState<ProgressState>({
    message: initialBundle?.run.status === "completed" ? "Analysis complete" : "Idle",
    percent: initialBundle?.run.status === "completed" ? 100 : 0,
  });

  const refreshBundle = useCallback(async (runId: string) => {
    const response = await fetch(`/api/analysis/${runId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { bundle: AnalysisBundle };
    setBundle(payload.bundle);
    return payload.bundle;
  }, []);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    if (!["pending", "running"].includes(bundle.run.status)) {
      return;
    }

    const eventSource = new EventSource(`/api/analysis/${bundle.run.id}/stream`);

    eventSource.onmessage = async (event) => {
      const payload = JSON.parse(event.data) as {
        type: string;
        message?: string;
        percent?: number;
        error?: string;
        bundle?: AnalysisBundle;
        nodes?: AnalysisBundle["graph"]["nodes"];
        edges?: AnalysisBundle["graph"]["edges"];
      };

      if (payload.type === "analysis.progress") {
        setProgress({
          message: payload.message ?? "Working",
          percent: payload.percent ?? 0,
        });
      }

      if (payload.type === "graph.delta" && payload.nodes && payload.edges) {
        setBundle((current) =>
          current
            ? {
                ...current,
                graph: {
                  nodes: payload.nodes!,
                  edges: payload.edges!,
                },
              }
            : current,
        );
      }

      if (payload.type === "agent.turn") {
        await refreshBundle(bundle.run.id);
      }

      if (payload.type === "analysis.completed" && payload.bundle) {
        setBundle(payload.bundle);
        setProgress({
          message: "Analysis complete",
          percent: 100,
        });
        eventSource.close();
      }

      if (payload.type === "analysis.failed") {
        await refreshBundle(bundle.run.id);
        setProgress({
          message: payload.error ?? "Analysis failed",
          percent: 100,
        });
        eventSource.close();
      }
    };

    return () => {
      eventSource.close();
    };
  }, [bundle, refreshBundle]);

  return useMemo(
    () => ({
      bundle,
      progress,
      refreshBundle,
      replaceBundle: setBundle,
    }),
    [bundle, progress, refreshBundle],
  );
}
