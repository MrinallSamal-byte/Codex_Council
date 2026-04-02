import type { Finding } from "@/lib/contracts/domain";
import { clampNumber } from "@/lib/utils";

const severityRank: Record<Finding["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function normalizeFindings(findings: Finding[]) {
  const merged = new Map<string, Finding>();

  for (const finding of findings) {
    const normalized: Finding = {
      ...finding,
      confidence: clampNumber(finding.confidence, 0, 1),
      impactedAreas: Array.from(new Set(finding.impactedAreas)),
      evidence: finding.evidence.filter(
        (item) => item.filePath || item.note || item.toolName || item.findingId,
      ),
      status: finding.status ?? "open",
    };

    const existing = merged.get(normalized.id);
    if (!existing) {
      merged.set(normalized.id, normalized);
      continue;
    }

    merged.set(normalized.id, {
      ...normalized,
      impactedAreas: Array.from(new Set([...existing.impactedAreas, ...normalized.impactedAreas])),
      evidence: [...existing.evidence, ...normalized.evidence],
      confidence: Math.max(existing.confidence, normalized.confidence),
      severity:
        severityRank[normalized.severity] > severityRank[existing.severity]
          ? normalized.severity
          : existing.severity,
      status: existing.status,
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    const severityDelta = severityRank[right.severity] - severityRank[left.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return right.confidence - left.confidence;
  });
}
