"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BrainCircuit,
  Clock3,
  Download,
  Gauge,
  Layers3,
  MessagesSquare,
  PanelRightClose,
  PanelRightOpen,
  Play,
  UserRoundSearch,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { AskSession, AskSessionBundle, AskTurn } from "@/lib/contracts/domain";
import { cn, formatDateTime, titleCase } from "@/lib/utils";

import { useLiveAskSession } from "../providers/use-live-ask-session";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const answerModes = [
  { value: "normal", label: "Normal", hint: "Fast single-agent answer." },
  { value: "debate", label: "Debate", hint: "Multi-agent critique and synthesis." },
  { value: "deep_council", label: "Deep Council", hint: "Slower multi-round council." },
] as const;

const modelStrategies = [
  { value: "single", label: "Single Model" },
  { value: "mixed", label: "Mixed Models" },
  { value: "auto", label: "Auto Routing" },
] as const;

const answerStyles = [
  { value: "concise", label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
] as const;

const priorities = [
  { value: "speed", label: "Speed" },
  { value: "balanced", label: "Balanced" },
  { value: "quality", label: "Quality" },
] as const;

type ControlState = {
  mode: "normal" | "debate" | "deep_council";
  agentCount: number;
  modelStrategy: "single" | "mixed" | "auto";
  answerStyle: "concise" | "balanced" | "detailed";
  priority: "speed" | "balanced" | "quality";
  showDebateProcess: boolean;
  finalAnswerOnly: boolean;
  webLookupAllowed: boolean;
  toolsAllowed: boolean;
  requestedModel: string;
  requestedProvider: string;
};

function controlsFromSession(session?: AskSession | null): ControlState {
  return {
    mode: session?.mode ?? "debate",
    agentCount: session?.agentCount ?? 4,
    modelStrategy: session?.modelStrategy ?? "auto",
    answerStyle: session?.answerStyle ?? "balanced",
    priority: session?.priority ?? "balanced",
    showDebateProcess: session?.showDebateProcess ?? true,
    finalAnswerOnly: session?.finalAnswerOnly ?? false,
    webLookupAllowed: session?.webLookupAllowed ?? false,
    toolsAllowed: session?.toolsAllowed ?? false,
    requestedModel: session?.requestedModel ?? "qwen/qwen3.6-plus:free",
    requestedProvider: session?.requestedProvider ?? "openrouter",
  };
}

export function CouncilWorkspace({
  initialBundle,
  initialSessions,
  maxParticipants,
  maxActiveAgents,
}: {
  initialBundle: AskSessionBundle | null;
  initialSessions: AskSession[];
  maxParticipants: number;
  maxActiveAgents: number;
}) {
  const router = useRouter();
  const { bundle, progress, assignments, activeRound, activeRoles, replaceBundle } =
    useLiveAskSession(initialBundle);
  const activeBundle = bundle ?? initialBundle;
  const [sessions, setSessions] = useState(initialSessions);
  const [question, setQuestion] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [controls, setControls] = useState<ControlState>(
    controlsFromSession(activeBundle?.session),
  );
  const [hideProcess, setHideProcess] = useState(activeBundle?.session.finalAnswerOnly ?? false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setControls(controlsFromSession(activeBundle?.session));
    setHideProcess(activeBundle?.session.finalAnswerOnly ?? false);
  }, [activeBundle?.session]);

  const groupedTurns = useMemo(() => {
    const groups = new Map<string, AskTurn[]>();

    for (const turn of activeBundle?.turns ?? []) {
      const key = `${turn.roundIndex}:${turn.roundType}`;
      const current = groups.get(key) ?? [];
      current.push(turn);
      groups.set(key, current);
    }

    return [...groups.entries()].map(([key, turns]) => {
      const [roundIndex, roundType] = key.split(":");
      return {
        roundIndex: Number(roundIndex),
        roundType: roundType as AskTurn["roundType"],
        turns,
      };
    });
  }, [activeBundle?.turns]);

  async function handleStartSession() {
    setError(null);

    const payload = {
      question,
      ...controls,
      requestedModel:
        controls.modelStrategy === "single" ? controls.requestedModel.trim() : undefined,
      requestedProvider:
        controls.modelStrategy === "single" ? controls.requestedProvider.trim() : undefined,
    };

    const response = await fetch("/api/ask/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to start Ask Mode.");
      return;
    }

    const data = (await response.json()) as { session: AskSession };
    const nextBundle: AskSessionBundle = {
      session: data.session,
      turns: [],
      exports: [],
    };

    replaceBundle(nextBundle);
    setSessions((current) => [data.session, ...current.filter((item) => item.id !== data.session.id)]);
    setQuestion("");
    router.push(`/ask?sessionId=${data.session.id}`);
  }

  async function handleContinueSession() {
    if (!activeBundle?.session.id) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/ask/sessions/${activeBundle.session.id}/continue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: followUpQuestion || activeBundle.session.question,
        ...controls,
        requestedModel:
          controls.modelStrategy === "single" ? controls.requestedModel.trim() : undefined,
        requestedProvider:
          controls.modelStrategy === "single" ? controls.requestedProvider.trim() : undefined,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to continue the session.");
      return;
    }

    const data = (await response.json()) as { session: AskSession };
    replaceBundle({
      ...(activeBundle ?? { turns: [], exports: [] }),
      session: data.session,
    });
    setSessions((current) => [data.session, ...current.filter((item) => item.id !== data.session.id)]);
    setFollowUpQuestion("");
    router.push(`/ask?sessionId=${data.session.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_30%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.9))] p-7">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge className="border-cyan-300/30 bg-cyan-400/10 text-cyan-100">
              AI Council Workspace
            </Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
              Ask anything, watch the chamber think, and decide how much council you want behind the answer.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate-300 lg:text-lg">
              RepoCouncil now runs two top-level experiences: Codebase Mode for architecture intelligence,
              and Ask Mode for premium debated answers, planning, writing, coding help, and decision support.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/codebase">
                <Button variant="secondary">Go to Codebase Mode</Button>
              </Link>
              <Link href="/debate">
                <Button variant="ghost">See codebase debate timeline</Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <StatCard
              icon={Layers3}
              label="Participants"
              value={`1-${maxParticipants}`}
              hint={`Up to ${maxActiveAgents} active model calls per council round on this deployment.`}
            />
            <StatCard
              icon={BrainCircuit}
              label="Strategies"
              value="Single · Mixed · Auto"
              hint="Model routing stays visible, including provider badges and fallbacks."
            />
            <StatCard
              icon={MessagesSquare}
              label="Exports"
              value="MD · JSON · PDF · ZIP"
              hint="Every session can be downloaded as a final answer or full debate bundle."
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-white/10 bg-slate-950/75">
            <CardHeader className="border-b border-white/10 bg-white/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Council Chamber</CardTitle>
                  <CardDescription>
                    Choose the answer mode, how many agents join, and how visible the debate should be.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Gauge className="mr-1 h-3.5 w-3.5" />
                    {controls.priority}
                  </Badge>
                  <Badge variant="secondary">
                    <Clock3 className="mr-1 h-3.5 w-3.5" />
                    {controls.mode === "normal" ? "Fast path" : "Council path"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-[28px] border border-cyan-400/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),rgba(15,23,42,0.92)] p-4">
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a research question, debate a product strategy, get architecture advice, brainstorm, study, compare options, or request coding help..."
                  className="min-h-[148px] border-0 bg-transparent px-0 text-base text-slate-100 shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Select
                  value={controls.mode}
                  onValueChange={(value) =>
                    setControls((current) => ({
                      ...current,
                      mode: value as ControlState["mode"],
                      agentCount: value === "normal" ? 1 : Math.max(current.agentCount, 2),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Answer mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {answerModes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(controls.agentCount)}
                  onValueChange={(value) =>
                    setControls((current) => ({
                      ...current,
                      agentCount: Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Agent count" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxParticipants }, (_, index) => index + 1).map((value) => (
                      <SelectItem
                        key={value}
                        value={String(value)}
                        disabled={controls.mode === "normal" && value !== 1}
                      >
                        {value} agent{value === 1 ? "" : "s"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={controls.modelStrategy}
                  onValueChange={(value) =>
                    setControls((current) => ({
                      ...current,
                      modelStrategy: value as ControlState["modelStrategy"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Model strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelStrategies.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={controls.answerStyle}
                  onValueChange={(value) =>
                    setControls((current) => ({
                      ...current,
                      answerStyle: value as ControlState["answerStyle"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Answer style" />
                  </SelectTrigger>
                  <SelectContent>
                    {answerStyles.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={controls.priority}
                  onValueChange={(value) =>
                    setControls((current) => ({
                      ...current,
                      priority: value as ControlState["priority"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Deployment profile
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Up to {maxActiveAgents} active agent calls at once
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Larger councils stage turns automatically if resources are tight.
                  </p>
                </div>
              </div>

              {controls.modelStrategy === "single" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Single Model
                    </p>
                    <Input
                      value={controls.requestedModel}
                      onChange={(event) =>
                        setControls((current) => ({
                          ...current,
                          requestedModel: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Provider
                    </p>
                    <Input
                      value={controls.requestedProvider}
                      onChange={(event) =>
                        setControls((current) => ({
                          ...current,
                          requestedProvider: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ToggleRow
                  label="Show debate process"
                  description="See the rounds, agent cards, and evolving chamber state."
                  checked={controls.showDebateProcess}
                  onCheckedChange={(checked) =>
                    setControls((current) => ({
                      ...current,
                      showDebateProcess: checked,
                    }))
                  }
                />
                <ToggleRow
                  label="Final answer only"
                  description="Collapse the chamber and focus on the synthesis panel."
                  checked={controls.finalAnswerOnly}
                  onCheckedChange={(checked) =>
                    setControls((current) => ({
                      ...current,
                      finalAnswerOnly: checked,
                    }))
                  }
                />
                <ToggleRow
                  label="Allow web lookup"
                  description="Persist this preference for evidence gathering runs."
                  checked={controls.webLookupAllowed}
                  onCheckedChange={(checked) =>
                    setControls((current) => ({
                      ...current,
                      webLookupAllowed: checked,
                    }))
                  }
                />
                <ToggleRow
                  label="Allow tools/code"
                  description="Persist whether tool-assisted turns are allowed."
                  checked={controls.toolsAllowed}
                  onCheckedChange={(checked) =>
                    setControls((current) => ({
                      ...current,
                      toolsAllowed: checked,
                    }))
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">1 = normal answer</Badge>
                  <Badge variant="secondary">2-3 = light debate</Badge>
                  <Badge variant="secondary">4-6 = full council</Badge>
                </div>
                <Button
                  size="lg"
                  disabled={isPending || question.trim().length < 2}
                  onClick={() => startTransition(handleStartSession)}
                >
                  <Play className="h-4 w-4" />
                  {isPending ? "Launching..." : "Ask the Council"}
                </Button>
              </div>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/75">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Final Answer</CardTitle>
                  <CardDescription>
                    Synthesized answer, supporting viewpoints, disagreements, and confidence.
                  </CardDescription>
                </div>
                {activeBundle?.session ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{activeBundle.session.status}</Badge>
                    <Badge variant="secondary">{progress.percent}%</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {activeBundle?.session ? (
                <>
                  <div className="rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),rgba(15,23,42,0.85)] p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
                        {activeBundle.session.mode === "normal" ? "Single-Agent" : "Council Synthesized"}
                      </Badge>
                      {activeBundle.session.canonicalSummary.finalAnswerModel ? (
                        <Badge variant="secondary">
                          {activeBundle.session.canonicalSummary.finalAnswerProvider} ·{" "}
                          {activeBundle.session.canonicalSummary.finalAnswerModel}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-200 prose-strong:text-white prose-li:text-slate-200">
                      <ReactMarkdown>
                        {activeBundle.session.finalAnswer || "The chamber is still assembling the final answer."}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <SummaryList
                      title="Supporting Viewpoints"
                      items={activeBundle.session.canonicalSummary.keySupportingViewpoints}
                    />
                    <SummaryList
                      title="Disagreements"
                      items={activeBundle.session.canonicalSummary.disagreements}
                    />
                    <SummaryList
                      title="Action Plan"
                      items={activeBundle.session.canonicalSummary.actionPlan}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Minority View
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        {activeBundle.session.canonicalSummary.minorityView || "No meaningful minority view remains."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Confidence
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-white">
                        {Math.round(activeBundle.session.canonicalSummary.confidence * 100)}%
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{progress.message}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
                  Ask a question to start a normal answer or a debated council session.
                </div>
              )}
            </CardContent>
          </Card>

          {activeBundle?.session ? (
            <Card className="border-white/10 bg-slate-950/75">
              <CardHeader>
                <CardTitle>Continue This Debate</CardTitle>
                <CardDescription>
                  Follow up, rerun with a different council size, or switch the answer mode without losing session memory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={followUpQuestion}
                  onChange={(event) => setFollowUpQuestion(event.target.value)}
                  placeholder="Continue this debate, ask a follow-up, or leave this blank to rerun with new controls..."
                  className="min-h-[110px]"
                />
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="max-w-2xl text-sm text-slate-400">
                    The next run reuses this session thread, its prior turns, and the canonical summary.
                  </p>
                  <Button disabled={isPending} onClick={() => startTransition(handleContinueSession)}>
                    {isPending ? "Re-running..." : "Continue / Rerun"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeBundle?.session && controls.showDebateProcess && !hideProcess ? (
            <Card className="border-white/10 bg-slate-950/75">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Debate Lab</CardTitle>
                    <CardDescription>
                      Live rounds, role turns, critiques, and synthesis artifacts.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHideProcess((current) => !current)}
                  >
                    <PanelRightClose className="h-4 w-4" />
                    Collapse
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {groupedTurns.length > 0 ? (
                  groupedTurns.map((round) => (
                    <div
                      key={`${round.roundIndex}_${round.roundType}`}
                      className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          Round {round.roundIndex}
                        </Badge>
                        <Badge variant="secondary">{titleCase(round.roundType)}</Badge>
                        {activeRound?.roundIndex === round.roundIndex ? (
                          <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                            Live
                          </Badge>
                        ) : null}
                      </div>
                      <div className="grid gap-4">
                        {round.turns.map((turn) => (
                          <details
                            key={turn.id}
                            className="group rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                          >
                            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {titleCase(turn.role)}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">{turn.summaryText}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{turn.provider}</Badge>
                                <Badge variant="secondary">{turn.model}</Badge>
                              </div>
                            </summary>
                            <div className="mt-4 space-y-4 text-sm text-slate-300">
                              {"answer" in turn.outputJson ? (
                                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300">
                                  <ReactMarkdown>
                                    {String(turn.outputJson.answer ?? "")}
                                  </ReactMarkdown>
                                </div>
                              ) : null}
                              <pre className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/90 p-3 text-xs text-slate-300">
                                {JSON.stringify(turn.outputJson, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
                    The debate transcript will appear here as agents complete their turns.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : activeBundle?.session && controls.showDebateProcess ? (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setHideProcess(false)}>
                <PanelRightOpen className="h-4 w-4" />
                Reopen debate panel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border-white/10 bg-slate-950/75">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Agent Board</CardTitle>
                  <CardDescription>
                    Live assignments, model badges, and speaking states inside the chamber.
                  </CardDescription>
                </div>
                {activeRound ? (
                  <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                    {titleCase(activeRound.roundType)} round
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length > 0 ? (
                assignments.map((assignment) => {
                  const isActive = activeRoles.includes(assignment.role);
                  return (
                    <div
                      key={assignment.role}
                      className={cn(
                        "rounded-[22px] border p-4 transition",
                        isActive
                          ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_26px_rgba(34,211,238,0.08)]"
                          : "border-white/10 bg-white/[0.02]",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-2xl border",
                              isActive
                                ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                                : "border-white/10 bg-white/[0.03] text-slate-200",
                            )}
                          >
                            <UserRoundSearch className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{assignment.label}</p>
                            <p className="text-xs text-slate-500">{assignment.rationale}</p>
                          </div>
                        </div>
                        <Badge variant={isActive ? "low" : "secondary"}>
                          {isActive ? "Thinking" : "Standby"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="secondary">{assignment.provider}</Badge>
                        <Badge variant="secondary">{assignment.model}</Badge>
                        {activeBundle?.turns.some(
                          (turn) => turn.role === assignment.role && turn.metadata?.heuristicFallback,
                        ) ? (
                          <Badge variant="high">Fallback</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
                  Agent cards appear here as soon as a question is launched.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>
                Re-open previous council threads or compare how different modes behaved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[330px] pr-2">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/ask?sessionId=${session.id}`}
                      className={cn(
                        "block rounded-2xl border p-4 transition hover:bg-white/[0.04]",
                        activeBundle?.session.id === session.id
                          ? "border-cyan-400/40 bg-cyan-400/10"
                          : "border-white/10 bg-white/[0.02]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{session.title}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(session.updatedAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">{session.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{titleCase(session.mode)}</Badge>
                        <Badge variant="secondary">{session.agentCount} agents</Badge>
                        <Badge variant="secondary">{titleCase(session.modelStrategy)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/75">
            <CardHeader>
              <CardTitle>Export / Share</CardTitle>
              <CardDescription>
                Download the final answer, the full transcript, or the whole council bundle.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {activeBundle?.session ? (
                <>
                  <ExportLink sessionId={activeBundle.session.id} format="markdown" label="Final Answer Markdown" />
                  <ExportLink sessionId={activeBundle.session.id} format="transcript" label="Full Debate Transcript" />
                  <ExportLink sessionId={activeBundle.session.id} format="json" label="Structured JSON" />
                  <ExportLink sessionId={activeBundle.session.id} format="pdf" label="PDF Summary" />
                  <ExportLink sessionId={activeBundle.session.id} format="zip" label="ZIP Session Bundle" />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
                  Launch or open a session to export it.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function SummaryList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No items yet.</p>
        )}
      </div>
    </div>
  );
}

function ExportLink({
  sessionId,
  format,
  label,
}: {
  sessionId: string;
  format: "markdown" | "transcript" | "json" | "pdf" | "zip";
  label: string;
}) {
  return (
    <Button asChild variant="secondary" className="justify-between">
      <a href={`/api/ask/sessions/${sessionId}/exports?format=${format}&download=true`}>
        <span>{label}</span>
        <Download className="h-4 w-4" />
      </a>
    </Button>
  );
}
