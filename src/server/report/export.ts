import type { AnalysisBundle } from "@/lib/contracts/domain";

export function buildMarkdownReport(bundle: AnalysisBundle) {
  const topFindings = bundle.findings
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6)
    .map(
      (finding) =>
        `- [${finding.severity.toUpperCase()}] ${finding.title} (${finding.filePath ?? "unknown file"})`,
    )
    .join("\n");

  const features = bundle.features
    .map((feature) => `- ${feature.title}: ${feature.value}`)
    .join("\n");

  return `# ${bundle.repository.name} Analysis Report

## Repository Summary
- Source: ${bundle.repository.sourceType}
- Stack: ${Object.values(bundle.repository.stackDetection).join(", ")}
- Analysis run: ${bundle.run.id}

## Top Findings
${topFindings}

## Recommended Features
${features}

## Judge Summary
${String(bundle.turns.at(-1)?.outputJson.summary ?? "Pending")}
`;
}
