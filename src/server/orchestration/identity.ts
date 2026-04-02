import { createHash } from "crypto";

import type { FeatureSuggestion, Finding } from "@/lib/contracts/domain";
import { slugify } from "@/lib/utils";

function hashSignature(value: unknown) {
  return createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 12);
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function scopeFindingIds(runId: string, findings: Finding[]) {
  const scopedRunId = slugify(runId);
  const remapped = findings.map((finding) => {
    const scopedId = `finding_${scopedRunId}_${hashSignature({
      category: finding.category,
      sourceAgent: finding.sourceAgent,
      title: normalizeText(finding.title),
      filePath: normalizeText(finding.filePath),
      symbol: normalizeText(finding.symbol),
      lineStart: finding.lineStart ?? null,
      lineEnd: finding.lineEnd ?? null,
    })}`;

    return {
      originalId: finding.id,
      finding: {
        ...finding,
        id: scopedId,
        analysisRunId: runId,
      },
    };
  });

  const idMap = new Map(remapped.map((entry) => [entry.originalId, entry.finding.id]));

  return remapped.map(({ originalId, finding }) => ({
    ...finding,
    evidence: finding.evidence.map((reference) => {
      if (!reference.findingId) {
        return reference;
      }

      return {
        ...reference,
        findingId:
          idMap.get(reference.findingId) ??
          (reference.findingId === originalId ? finding.id : reference.findingId),
      };
    }),
  }));
}

export function scopeFeatureIds(runId: string, features: FeatureSuggestion[]) {
  const scopedRunId = slugify(runId);
  const deduped = new Map<string, FeatureSuggestion>();

  for (const feature of features) {
    const scopedId = `feature_${scopedRunId}_${hashSignature({
      title: normalizeText(feature.title),
      value: normalizeText(feature.value),
      rationale: normalizeText(feature.rationale),
      impactedModules: [...feature.impactedModules].map(normalizeText).sort(),
      effort: feature.effort,
    })}`;

    deduped.set(scopedId, {
      ...feature,
      id: scopedId,
      analysisRunId: runId,
    });
  }

  return Array.from(deduped.values());
}
