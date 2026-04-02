import JSZip from "jszip";

import type { AskExport, AskSessionBundle } from "@/lib/contracts/domain";
import { formatDateTime, slugify, titleCase } from "@/lib/utils";

function renderList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function buildAskMarkdown(bundle: AskSessionBundle) {
  const summary = bundle.session.canonicalSummary;

  return `# ${bundle.session.title}

## Question
${bundle.session.question}

## Final Answer
${bundle.session.finalAnswer || "Pending"}

## Supporting Viewpoints
${renderList(summary.keySupportingViewpoints)}

## Disagreements
${renderList(summary.disagreements)}

## Action Plan
${renderList(summary.actionPlan)}

## Confidence
- ${Math.round(summary.confidence * 100)}%

## Model Routing
${summary.assignments
  .map((assignment) => `- ${assignment.label}: ${assignment.provider} · ${assignment.model}`)
  .join("\n")}

## Minority View
${summary.minorityView || "None"}
`;
}

export function buildAskTranscriptMarkdown(bundle: AskSessionBundle) {
  return `# ${bundle.session.title} Transcript

${bundle.turns
  .map(
    (turn) => `## Round ${turn.roundIndex}: ${titleCase(turn.roundType)} · ${titleCase(turn.role)}

- Model: ${turn.provider} · ${turn.model}
- Summary: ${turn.summaryText}

\`\`\`json
${JSON.stringify(turn.outputJson, null, 2)}
\`\`\`
`,
  )
  .join("\n")}`;
}

export function buildAskStructuredJson(bundle: AskSessionBundle) {
  return JSON.stringify(bundle, null, 2);
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

export async function buildAskExportArtifact(
  bundle: AskSessionBundle,
  format: AskExport["format"],
): Promise<AskExport> {
  const safeSlug = slugify(bundle.session.title) || bundle.session.id;
  const createdAt = new Date().toISOString();
  const sourceUpdatedAt = bundle.session.updatedAt;

  if (format === "markdown") {
    return {
      id: `ask_export_${bundle.session.id}_markdown`,
      sessionId: bundle.session.id,
      title: `${bundle.session.title} Markdown`,
      format,
      content: buildAskMarkdown(bundle),
      metadata: {
        filename: `${safeSlug}.md`,
        mimeType: "text/markdown; charset=utf-8",
        sourceUpdatedAt,
      },
      createdAt,
    };
  }

  if (format === "transcript") {
    return {
      id: `ask_export_${bundle.session.id}_transcript`,
      sessionId: bundle.session.id,
      title: `${bundle.session.title} Transcript`,
      format,
      content: buildAskTranscriptMarkdown(bundle),
      metadata: {
        filename: `${safeSlug}-transcript.md`,
        mimeType: "text/markdown; charset=utf-8",
        sourceUpdatedAt,
      },
      createdAt,
    };
  }

  if (format === "json") {
    return {
      id: `ask_export_${bundle.session.id}_json`,
      sessionId: bundle.session.id,
      title: `${bundle.session.title} JSON`,
      format,
      content: buildAskStructuredJson(bundle),
      metadata: {
        filename: `${safeSlug}.json`,
        mimeType: "application/json; charset=utf-8",
        sourceUpdatedAt,
      },
      createdAt,
    };
  }

  if (format === "pdf") {
    const pdfText = [
      bundle.session.title,
      `Generated: ${formatDateTime(createdAt)}`,
      "",
      "Question",
      bundle.session.question,
      "",
      "Final Answer",
      bundle.session.finalAnswer || "Pending",
      "",
      "Supporting Viewpoints",
      ...bundle.session.canonicalSummary.keySupportingViewpoints,
      "",
      "Action Plan",
      ...bundle.session.canonicalSummary.actionPlan,
    ].join("\n");

    return {
      id: `ask_export_${bundle.session.id}_pdf`,
      sessionId: bundle.session.id,
      title: `${bundle.session.title} PDF`,
      format,
      content: buildSimplePdfBuffer(bundle.session.title, pdfText).toString("base64"),
      metadata: {
        filename: `${safeSlug}.pdf`,
        mimeType: "application/pdf",
        encoding: "base64",
        sourceUpdatedAt,
      },
      createdAt,
    };
  }

  const zip = new JSZip();
  zip.file("final-answer.md", buildAskMarkdown(bundle));
  zip.file("transcript.md", buildAskTranscriptMarkdown(bundle));
  zip.file("session.json", buildAskStructuredJson(bundle));
  zip.file(
    "README.txt",
    `RepoCouncil Ask Session Export\nGenerated: ${createdAt}\nSession: ${bundle.session.title}\n`,
  );

  const pdfArtifact = await buildAskExportArtifact(bundle, "pdf");
  zip.file("summary.pdf", Buffer.from(pdfArtifact.content, "base64"));

  return {
    id: `ask_export_${bundle.session.id}_zip`,
    sessionId: bundle.session.id,
    title: `${bundle.session.title} ZIP`,
    format,
    content: (await zip.generateAsync({ type: "nodebuffer" })).toString("base64"),
    metadata: {
      filename: `${safeSlug}.zip`,
      mimeType: "application/zip",
      encoding: "base64",
      sourceUpdatedAt,
    },
    createdAt,
  };
}

export function isAskExportArtifactStale(bundle: AskSessionBundle, artifact: AskExport) {
  const sourceUpdatedAt = String(artifact.metadata.sourceUpdatedAt ?? "");
  return sourceUpdatedAt !== bundle.session.updatedAt;
}

export function resolveAskArtifactPayload(artifact: AskExport) {
  const encoding = String(artifact.metadata.encoding ?? "utf8");
  const filename = String(
    artifact.metadata.filename ??
      `${slugify(artifact.title) || artifact.id}.${artifact.format === "transcript" ? "md" : artifact.format}`,
  );
  const mimeType = String(
    artifact.metadata.mimeType ??
      (artifact.format === "json"
        ? "application/json; charset=utf-8"
        : artifact.format === "pdf"
          ? "application/pdf"
          : artifact.format === "zip"
            ? "application/zip"
            : "text/markdown; charset=utf-8"),
  );

  const content =
    encoding === "base64" ? Buffer.from(artifact.content, "base64") : artifact.content;

  return {
    content,
    filename,
    mimeType,
  };
}
