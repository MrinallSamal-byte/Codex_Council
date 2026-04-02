import { promises as fs } from "fs";
import path from "path";

import JSZip from "jszip";

import type { AnalysisBundle, Finding } from "@/lib/contracts/domain";
import { env } from "@/env";
import { formatDateTime, slugify, titleCase } from "@/lib/utils";

import type { ExportReport } from "../db/storage";

type AnalysisExportFormat = ExportReport["format"];

const exportMimeTypes: Record<AnalysisExportFormat, string> = {
  markdown: "text/markdown; charset=utf-8",
  html: "text/html; charset=utf-8",
  json: "application/json; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  mermaid: "text/plain; charset=utf-8",
  pdf: "application/pdf",
  zip: "application/zip",
};

function renderList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function buildFindingBullet(finding: Finding) {
  return `- [${finding.severity.toUpperCase()}] ${finding.title} (${finding.filePath ?? "unknown file"})`;
}

function sortFindings(findings: Finding[]) {
  return [...findings].sort((left, right) => right.confidence - left.confidence);
}

function getJudgeOutput(bundle: AnalysisBundle) {
  return (bundle.turns.findLast((turn) => turn.agentName === "judge")?.outputJson ?? {}) as {
    summary?: string;
    urgentFixes?: string[];
    incompleteAreas?: string[];
    structuralRefactors?: string[];
    phasedRoadmap?: Array<{ phase: string; goals: string[] }>;
    openQuestions?: string[];
  };
}

function buildDebateTranscript(bundle: AnalysisBundle) {
  return `# Debate Transcript\n\n${bundle.turns
    .map(
      (turn) => `## Turn ${turn.turnIndex}: ${titleCase(turn.agentName)}\n\n- Model: ${turn.provider} · ${turn.model}\n- Summary: ${turn.inputSummary ?? "No input summary"}\n\n\`\`\`json\n${JSON.stringify(turn.outputJson, null, 2)}\n\`\`\`\n`,
    )
    .join("\n")}`;
}

function buildDebateStateJson(bundle: AnalysisBundle) {
  return JSON.stringify(
    {
      run: bundle.run,
      latestSnapshot: bundle.snapshots.at(-1) ?? null,
      turns: bundle.turns.map((turn) => ({
        id: turn.id,
        agentName: turn.agentName,
        provider: turn.provider,
        model: turn.model,
        turnIndex: turn.turnIndex,
        inputSummary: turn.inputSummary,
        evidenceRefs: turn.evidenceRefs,
        metadata: turn.metadata ?? {},
      })),
    },
    null,
    2,
  );
}

function buildExecutiveSummary(bundle: AnalysisBundle) {
  const judgeOutput = getJudgeOutput(bundle);
  const topFindings = sortFindings(bundle.findings).slice(0, 5).map(buildFindingBullet);

  return `# Executive Summary\n\n## Repository\n- Name: ${bundle.repository.name}\n- Source: ${bundle.repository.sourceType}\n- Run: ${bundle.run.id}\n- Completed: ${bundle.run.completedAt ? formatDateTime(bundle.run.completedAt) : "Pending"}\n\n## Run Summary\n- Findings: ${bundle.findings.length}\n- Features: ${bundle.features.length}\n- Patch Plans: ${bundle.patches.length}\n- Debate Turns: ${bundle.turns.length}\n\n## Judge Summary\n${judgeOutput.summary ?? "Pending"}\n\n## Top Findings\n${topFindings.length > 0 ? topFindings.join("\n") : "- None"}\n\n## Immediate Priorities\n${renderList(judgeOutput.urgentFixes ?? [])}\n`;
}

function buildProjectStatusReport(bundle: AnalysisBundle) {
  const securityFindings = bundle.findings.filter((finding) => finding.category === "security");
  const implementationFindings = bundle.findings.filter(
    (finding) => finding.category === "implementation",
  );
  const maintainabilityFindings = bundle.findings.filter(
    (finding) => finding.category === "maintainability",
  );
  const judgeOutput = getJudgeOutput(bundle);

  return `# Project Status Report\n\n## What This Project Currently Is\n- Imported source: ${bundle.repository.sourceType}\n- Stack detection: ${Object.values(bundle.repository.stackDetection).join(", ") || "Unknown"}\n- Graph nodes: ${bundle.graph.nodes.length}\n- Graph edges: ${bundle.graph.edges.length}\n\n## Current Maturity\n- Analysis status: ${bundle.run.status}\n- Debate turns: ${bundle.turns.length}\n- Snapshots: ${bundle.snapshots.length}\n- Tool executions: ${bundle.tools.length}\n\n## Current Feature Status\n- Findings captured: ${bundle.findings.length}\n- Features suggested: ${bundle.features.length}\n- Patch plans drafted: ${bundle.patches.length}\n\n## Runnability Status\n- Latest report generated: ${bundle.reports.length > 0 ? "Yes" : "No"}\n- Latest snapshot available: ${bundle.snapshots.length > 0 ? "Yes" : "No"}\n\n## Bugs / Gaps / Incomplete Areas\n${renderList(judgeOutput.incompleteAreas ?? implementationFindings.map((finding) => finding.title))}\n\n## Security Findings\n${renderList(securityFindings.map((finding) => finding.title))}\n\n## Maintainability Findings\n${renderList(maintainabilityFindings.map((finding) => finding.title))}\n\n## Product Readiness Review\n- Confidence: ${Math.round((((bundle.run.summary as { totalFindings?: number })?.totalFindings ?? bundle.findings.length) > 0 ? 0.7 : 0.45) * 100)}%\n- Open questions: ${(judgeOutput.openQuestions ?? []).length}\n\n## Recommended Next Plan\n${buildRecommendedNextPlan(bundle)}\n`;
}

function buildSecurityReport(bundle: AnalysisBundle) {
  const securityFindings = sortFindings(
    bundle.findings.filter((finding) => finding.category === "security"),
  );

  return `# Security Report\n\n${securityFindings.length > 0 ? securityFindings.map(buildFindingBullet).join("\n") : "No direct security findings were persisted for this run."}\n`;
}

function buildImplementationGaps(bundle: AnalysisBundle) {
  const findings = sortFindings(
    bundle.findings.filter((finding) => finding.category === "implementation"),
  );

  return `# Implementation Gaps\n\n${findings.length > 0 ? findings.map(buildFindingBullet).join("\n") : "No implementation gaps were persisted for this run."}\n`;
}

function buildFeatureSuggestions(bundle: AnalysisBundle) {
  return `# Feature Suggestions\n\n${bundle.features
    .map(
      (feature) => `## ${feature.title}\n- User value: ${feature.value}\n- Why it fits: ${feature.rationale}\n- Affected modules: ${feature.impactedModules.join(", ") || "None listed"}\n- Effort: ${feature.effort}\n- Technical risk: ${feature.risk}\n- Dependency impact: ${feature.dependencyImpact}\n- Security considerations: ${feature.securityNotes}\n`,
    )
    .join("\n")}`;
}

function buildPatchPlansMarkdown(bundle: AnalysisBundle) {
  return `# Patch Plans\n\n${bundle.patches
    .map(
      (patch) => `## ${patch.title}\n- Why it matters: ${patch.whyItMatters}\n- Root cause: ${patch.rootCause}\n- Files affected: ${patch.filesAffected.join(", ") || "Unknown"}\n- Confidence: ${Math.round(patch.confidence * 100)}%\n- Status: ${patch.status}\n${renderList(patch.recommendedSteps)}\n`,
    )
    .join("\n")}`;
}

function buildRecommendedNextPlan(bundle: AnalysisBundle) {
  const judgeOutput = getJudgeOutput(bundle);
  const items = [
    ...(judgeOutput.urgentFixes ?? []),
    ...(judgeOutput.structuralRefactors ?? []),
    ...(judgeOutput.incompleteAreas ?? []),
  ].slice(0, 8);

  return renderList(items);
}

function buildFindingsCsv(bundle: AnalysisBundle) {
  const header = [
    "id",
    "category",
    "severity",
    "confidence",
    "title",
    "filePath",
    "lineStart",
    "sourceAgent",
  ];

  const rows = bundle.findings.map((finding) => [
    finding.id,
    finding.category,
    finding.severity,
    String(finding.confidence),
    finding.title,
    finding.filePath ?? "",
    finding.lineStart != null ? String(finding.lineStart) : "",
    finding.sourceAgent,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

function buildArchitectureMermaid(bundle: AnalysisBundle) {
  const lines = ["graph LR"];
  const renderedNodes = new Set<string>();

  for (const node of bundle.graph.nodes) {
    const nodeId = slugify(node.nodeKey).replaceAll("-", "_") || "node";
    if (renderedNodes.has(nodeId)) {
      continue;
    }
    renderedNodes.add(nodeId);
    lines.push(`  ${nodeId}["${node.label}"]`);
  }

  for (const edge of bundle.graph.edges) {
    const sourceId = slugify(edge.sourceNodeKey).replaceAll("-", "_") || "source";
    const targetId = slugify(edge.targetNodeKey).replaceAll("-", "_") || "target";
    lines.push(`  ${sourceId} -->|"${edge.label ?? edge.kind}"| ${targetId}`);
  }

  return lines.join("\n");
}

function buildAnalysisJson(bundle: AnalysisBundle) {
  return JSON.stringify(bundle, null, 2);
}

export function buildMarkdownReport(bundle: AnalysisBundle) {
  const judgeOutput = getJudgeOutput(bundle);
  const topFindings = sortFindings(bundle.findings)
    .slice(0, 6)
    .map(buildFindingBullet)
    .join("\n");

  const features = bundle.features
    .map((feature) => `- ${feature.title}: ${feature.value}`)
    .join("\n");

  return `# ${bundle.repository.name} Analysis Report\n\n## Repository Summary\n- Source: ${bundle.repository.sourceType}\n- Stack: ${Object.values(bundle.repository.stackDetection).join(", ") || "Unknown"}\n- Analysis run: ${bundle.run.id}\n\n## Top Findings\n${topFindings || "- None"}\n\n## Recommended Features\n${features || "- None"}\n\n## Judge Summary\n${judgeOutput.summary ?? "Pending"}\n`;
}

function sanitizePdfText(text: string) {
  return text
    .replace(/[^\x20-\x7E\n]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line: string, maxLength = 88) {
  if (line.length <= maxLength) {
    return [line];
  }

  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
      if (current) {
        wrapped.push(current);
      }
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped.length > 0 ? wrapped : [line];
}

function buildSimplePdfBuffer(title: string, content: string) {
  const normalizedLines = [title, "", ...content.split("\n")]
    .flatMap((line) => wrapLine(sanitizePdfText(line)))
    .map((line) => line || " ");

  const linesPerPage = 44;
  const pageChunks: string[][] = [];

  for (let index = 0; index < normalizedLines.length; index += linesPerPage) {
    pageChunks.push(normalizedLines.slice(index, index + linesPerPage));
  }

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

  const pageObjectNumbers = pageChunks.map((_, index) => 4 + index * 2);
  const pageRefs = pageObjectNumbers.map((number) => `${number} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pageChunks.length} /Kids [${pageRefs}] >> endobj`);
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  pageChunks.forEach((lines, index) => {
    const pageObjectNumber = pageObjectNumbers[index]!;
    const contentObjectNumber = pageObjectNumber + 1;
    const stream = `BT /F1 11 Tf 48 790 Td 14 TL ${lines
      .map((line, lineIndex) => `${lineIndex === 0 ? `(${line}) Tj` : `T* (${line}) Tj`}`)
      .join(" ")} ET`;

    objects.push(
      `${pageObjectNumber} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >> endobj`,
    );
    objects.push(
      `${contentObjectNumber} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function getExportRoot() {
  return path.resolve(process.cwd(), env.EXPORT_STORAGE_ROOT);
}

function getExportFilename(bundle: AnalysisBundle, format: AnalysisExportFormat) {
  const baseName = slugify(bundle.repository.name) || "analysis";
  switch (format) {
    case "markdown":
      return `${baseName}-report.md`;
    case "json":
      return `${baseName}-report.json`;
    case "csv":
      return `${baseName}-findings.csv`;
    case "mermaid":
      return `${baseName}-architecture.mmd`;
    case "pdf":
      return `${baseName}-summary.pdf`;
    case "zip":
      return `${baseName}-bundle.zip`;
    default:
      return `${baseName}-report.txt`;
  }
}

export function getMarkdownReportArtifactPath(bundle: AnalysisBundle) {
  return path.join(getExportRoot(), bundle.run.id, getExportFilename(bundle, "markdown"));
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

export async function buildAnalysisExportArtifact(
  bundle: AnalysisBundle,
  format: AnalysisExportFormat,
): Promise<ExportReport> {
  const createdAt = new Date().toISOString();
  const artifactId = `report_${bundle.run.id}_${format}`;

  if (format === "markdown") {
    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} Markdown Report`,
      format,
      content: buildMarkdownReport(bundle),
      createdAt,
    };
  }

  if (format === "json") {
    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} Structured JSON`,
      format,
      content: buildAnalysisJson(bundle),
      createdAt,
    };
  }

  if (format === "csv") {
    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} Findings CSV`,
      format,
      content: buildFindingsCsv(bundle),
      createdAt,
    };
  }

  if (format === "mermaid") {
    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} Mermaid Graph`,
      format,
      content: buildArchitectureMermaid(bundle),
      createdAt,
    };
  }

  if (format === "pdf") {
    const pdfText = [
      bundle.repository.name,
      `Generated: ${formatDateTime(createdAt)}`,
      "",
      buildExecutiveSummary(bundle),
      "",
      "Recommended Next Plan",
      buildRecommendedNextPlan(bundle),
    ].join("\n");

    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} PDF Summary`,
      format,
      content: buildSimplePdfBuffer(bundle.repository.name, pdfText).toString("base64"),
      createdAt,
    };
  }

  if (format === "html") {
    return {
      id: artifactId,
      analysisRunId: bundle.run.id,
      title: `${bundle.repository.name} HTML Report`,
      format,
      content: `<pre>${buildMarkdownReport(bundle)}</pre>`,
      createdAt,
    };
  }

  const zip = new JSZip();
  zip.file("EXECUTIVE_SUMMARY.md", buildExecutiveSummary(bundle));
  zip.file("PROJECT_STATUS_REPORT.md", buildProjectStatusReport(bundle));
  zip.file("FINDINGS.json", JSON.stringify(bundle.findings, null, 2));
  zip.file("FINDINGS.csv", buildFindingsCsv(bundle));
  zip.file("SECURITY_REPORT.md", buildSecurityReport(bundle));
  zip.file("IMPLEMENTATION_GAPS.md", buildImplementationGaps(bundle));
  zip.file("FEATURE_SUGGESTIONS.md", buildFeatureSuggestions(bundle));
  zip.file("PATCH_PLANS.md", buildPatchPlansMarkdown(bundle));
  zip.file("ARCHITECTURE_GRAPH.mmd", buildArchitectureMermaid(bundle));
  zip.file("DEBATE_TRANSCRIPT.md", buildDebateTranscript(bundle));
  zip.file("DEBATE_STATE.json", buildDebateStateJson(bundle));
  zip.file("RECOMMENDED_NEXT_PLAN.md", buildRecommendedNextPlan(bundle));

  const pdfArtifact = await buildAnalysisExportArtifact(bundle, "pdf");
  zip.file("EXECUTIVE_SUMMARY.pdf", Buffer.from(pdfArtifact.content, "base64"));

  return {
    id: artifactId,
    analysisRunId: bundle.run.id,
    title: `${bundle.repository.name} ZIP Bundle`,
    format,
    content: (await zip.generateAsync({ type: "nodebuffer" })).toString("base64"),
    createdAt,
  };
}

export function resolveAnalysisArtifactPayload(bundle: AnalysisBundle, artifact: ExportReport) {
  const filename = getExportFilename(bundle, artifact.format);
  const mimeType = exportMimeTypes[artifact.format];
  const content =
    artifact.format === "pdf" || artifact.format === "zip"
      ? Buffer.from(artifact.content, "base64")
      : artifact.content;

  return {
    content,
    filename,
    mimeType,
  };
}
