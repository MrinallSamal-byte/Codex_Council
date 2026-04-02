import type { AnalysisRun, Repository } from "@/lib/contracts/domain";

export function buildSystemPrompt(agentName: string) {
  return `You are the ${agentName} agent for RepoCouncil. Be evidence-based, concise, and return only structured JSON. Unsupported claims must be expressed as low-confidence observations.`;
}

export function buildUserPrompt(params: {
  repository: Repository;
  run: AnalysisRun;
  analyzerSummary: Record<string, unknown>;
  workingMemory: Record<string, unknown>;
}) {
  return JSON.stringify(
    {
      repository: params.repository,
      analysisRun: params.run,
      analyzerSummary: params.analyzerSummary,
      workingMemory: params.workingMemory,
    },
    null,
    2,
  );
}
