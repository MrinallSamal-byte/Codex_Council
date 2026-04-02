"use client";

import { formatDistanceToNow } from "date-fns";

import type { AnalysisBundle } from "@/lib/contracts/domain";
import { titleCase } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

export function DebateTimeline({
  turns,
  selectedTurnId,
  onSelectTurn,
}: {
  turns: AnalysisBundle["turns"];
  selectedTurnId?: string;
  onSelectTurn?: (turnId: string) => void;
}) {
  return (
    <ScrollArea className="h-[70vh] rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
      <div className="space-y-4">
        {turns.map((turn) => (
          <button
            key={turn.id}
            type="button"
            onClick={() => onSelectTurn?.(turn.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selectedTurnId === turn.id
                ? "border-cyan-400/40 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-white">
                {titleCase(turn.agentName)}
              </span>
              {turn.metadata?.heuristicFallback ? (
                <Badge variant="high">Heuristic fallback</Badge>
              ) : null}
              {turn.metadata?.fallbackUsed && !turn.metadata?.heuristicFallback ? (
                <Badge variant="medium">Fallback used</Badge>
              ) : null}
              <span className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                {turn.provider}
              </span>
              <span className="text-xs text-slate-500">{turn.model}</span>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(turn.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="mb-3 text-sm text-slate-300">{turn.inputSummary}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span>{turn.evidenceRefs.length} evidence refs</span>
              <span>{turn.metadata?.attempts.length ?? 0} model attempts</span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
