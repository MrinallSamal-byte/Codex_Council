"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AskAgentAssignment, AskSessionBundle, AskTurn } from "@/lib/contracts/domain";

type ProgressState = {
  message: string;
  percent: number;
};

type ActiveRoundState = {
  roundIndex: number;
  roundType: AskTurn["roundType"];
  roles: AskTurn["role"][];
} | null;

export function useLiveAskSession(initialBundle: AskSessionBundle | null) {
  const [bundle, setBundle] = useState(initialBundle);
  const [progress, setProgress] = useState<ProgressState>({
    message:
      initialBundle?.session.status === "completed"
        ? "Council answer complete"
        : "Ready to run",
    percent: initialBundle?.session.status === "completed" ? 100 : 0,
  });
  const [assignments, setAssignments] = useState<AskAgentAssignment[]>(
    initialBundle?.session.canonicalSummary.assignments ?? [],
  );
  const [activeRound, setActiveRound] = useState<ActiveRoundState>(null);
  const [activeRoles, setActiveRoles] = useState<AskTurn["role"][]>([]);

  useEffect(() => {
    setBundle(initialBundle);
    setAssignments(initialBundle?.session.canonicalSummary.assignments ?? []);
    setActiveRound(null);
    setActiveRoles([]);
    setProgress({
      message:
        initialBundle?.session.status === "completed"
          ? "Council answer complete"
          : initialBundle?.session.status === "running"
            ? "Council in progress"
            : "Ready to run",
      percent:
        initialBundle?.session.status === "completed"
          ? 100
          : initialBundle?.session.status === "running"
            ? 10
            : 0,
    });
  }, [initialBundle]);

  useEffect(() => {
    setAssignments(bundle?.session.canonicalSummary.assignments ?? []);
  }, [bundle?.session.id, bundle?.session.canonicalSummary.assignments]);

  const refreshBundle = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/ask/sessions/${sessionId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { bundle: AskSessionBundle };
    setBundle(payload.bundle);
    setAssignments(payload.bundle.session.canonicalSummary.assignments);
    return payload.bundle;
  }, []);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    if (!["pending", "running"].includes(bundle.session.status)) {
      return;
    }

    const eventSource = new EventSource(`/api/ask/sessions/${bundle.session.id}/stream`);

    eventSource.onmessage = async (event) => {
      const payload = JSON.parse(event.data) as {
        type: string;
        message?: string;
        percent?: number;
        assignments?: AskAgentAssignment[];
        roundIndex?: number;
        roundType?: AskTurn["roundType"];
        roles?: AskTurn["role"][];
        turn?: AskTurn;
        turnId?: string;
        role?: AskTurn["role"];
        session?: AskSessionBundle;
        error?: string;
      };

      if (payload.type === "ask.progress") {
        setProgress({
          message: payload.message ?? "Working",
          percent: payload.percent ?? 0,
        });
      }

      if (payload.type === "ask.agent.assigned" && payload.assignments) {
        setAssignments(payload.assignments);
      }

      if (
        payload.type === "ask.round.started" &&
        payload.roundIndex !== undefined &&
        payload.roundType &&
        payload.roles
      ) {
        setActiveRound({
          roundIndex: payload.roundIndex,
          roundType: payload.roundType,
          roles: payload.roles,
        });
        setActiveRoles(payload.roles);
      }

      if (payload.type === "ask.turn.started" && payload.turn) {
        setActiveRoles((current) =>
          current.includes(payload.turn!.role) ? current : [...current, payload.turn!.role],
        );
      }

      if (payload.type === "ask.turn.completed" && payload.turnId) {
        if (payload.role) {
          setActiveRoles((current) => current.filter((role) => role !== payload.role));
        }
        await refreshBundle(bundle.session.id);
      }

      if (payload.type === "ask.completed" && payload.session) {
        setBundle(payload.session);
        setAssignments(payload.session.session.canonicalSummary.assignments);
        setProgress({
          message: "Council answer complete",
          percent: 100,
        });
        setActiveRound(null);
        setActiveRoles([]);
        eventSource.close();
      }

      if (payload.type === "ask.failed") {
        setProgress({
          message: payload.error ?? "Ask session failed",
          percent: 100,
        });
        await refreshBundle(bundle.session.id);
        setActiveRound(null);
        setActiveRoles([]);
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
      assignments,
      activeRound,
      activeRoles,
      refreshBundle,
      replaceBundle: setBundle,
    }),
    [activeRound, activeRoles, assignments, bundle, progress, refreshBundle],
  );
}
