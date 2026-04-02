import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import { type Finding } from "@/lib/contracts/domain";
import { slugify } from "@/lib/utils";

import { type RepoToolAdapter } from "./base";

const TodoFinderInputSchema = z.object({
  workspacePath: z.string(),
  files: z.array(z.string()),
  analysisRunId: z.string(),
});

const TodoFinderOutputSchema = z.object({
  findings: z.array(z.any()),
});

const markerPattern = /\b(TODO|FIXME|stub|placeholder)\b/i;

export const todoFinder: RepoToolAdapter<
  typeof TodoFinderInputSchema,
  typeof TodoFinderOutputSchema
> = {
  name: "todo-finder",
  description: "Finds TODOs, FIXMEs, stubs, and placeholder handlers in source files.",
  inputSchema: TodoFinderInputSchema,
  outputSchema: TodoFinderOutputSchema,
  async execute(input) {
    const findings: Finding[] = [];

    for (const file of input.files.filter((item) => /\.(ts|tsx|js|jsx|md)$/.test(item))) {
      const absolutePath = path.join(input.workspacePath, file);
      const content = await fs.readFile(absolutePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (!markerPattern.test(line)) {
          return;
        }

        findings.push({
          id: `todo_${slugify(`${file}_${index}`)}`,
          analysisRunId: input.analysisRunId,
          category: "implementation",
          severity: "medium",
          confidence: 0.8,
          title: `TODO marker in ${path.basename(file)}`,
          description: line.trim(),
          filePath: file,
          symbol: undefined,
          lineStart: index + 1,
          lineEnd: index + 1,
          impactedAreas: ["ui"],
          evidence: [
            {
              toolName: "todo-finder",
              filePath: file,
              lineStart: index + 1,
              lineEnd: index + 1,
              excerpt: line.trim(),
            },
          ],
          status: "open",
          sourceAgent: "implementation",
        });
      });
    }

    return { findings };
  },
};
