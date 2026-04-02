import { promises as fs } from "fs";
import path from "path";

import type { AnalysisBundle } from "@/lib/contracts/domain";
import { env } from "@/env";
import { slugify } from "@/lib/utils";

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

function getExportRoot() {
  return path.resolve(process.cwd(), env.EXPORT_STORAGE_ROOT);
}

function getMarkdownFilename(repositoryName: string) {
  const baseName = slugify(repositoryName) || "analysis";
  return `${baseName}-report.md`;
}

export function getMarkdownReportArtifactPath(bundle: AnalysisBundle) {
  return path.join(getExportRoot(), bundle.run.id, getMarkdownFilename(bundle.repository.name));
}

export async function ensureMarkdownReportArtifact(params: {
  bundle: AnalysisBundle;
  reportContent?: string | null;
}) {
  const content = params.reportContent ?? buildMarkdownReport(params.bundle);
  const filePath = getMarkdownReportArtifactPath(params.bundle);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");

  return {
    content,
    filePath,
    filename: path.basename(filePath),
  };
}
