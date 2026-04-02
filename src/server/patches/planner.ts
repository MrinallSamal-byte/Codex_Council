import type { PatchPlan, Finding } from "@/lib/contracts/domain";
import { slugify } from "@/lib/utils";

export function buildPatchPlans(runId: string, findings: Finding[]): PatchPlan[] {
  return findings.slice(0, 5).map((finding) => ({
    id: `patch_${slugify(runId)}_${slugify(finding.id)}`,
    analysisRunId: runId,
    findingId: finding.id,
    title: `Plan fix for: ${finding.title}`,
    whyItMatters: finding.description,
    rootCause: `Root cause inferred from ${finding.filePath ?? "the affected module"} and current analyzer evidence.`,
    filesAffected: [finding.filePath ?? "unknown"],
    recommendedSteps: [
      "Confirm the evidence and reproduce the issue locally.",
      "Patch the boundary where the behavior enters the system.",
      "Add regression coverage around the affected path.",
    ],
    draftPatch:
      finding.filePath && finding.lineStart
        ? `// Suggested patch entrypoint: ${finding.filePath}:${finding.lineStart}`
        : null,
    confidence: finding.confidence,
    status: "draft",
  }));
}
