import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import type { GraphEdge, GraphNode } from "@/lib/contracts/domain";
import { slugify } from "@/lib/utils";

import { type RepoToolAdapter } from "./base";
import { buildGraphNodeKey, inferNodeType } from "./graph-key";

const ImportGraphInputSchema = z.object({
  workspacePath: z.string(),
  files: z.array(z.string()),
  analysisRunId: z.string(),
});

const ImportGraphOutputSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

const sourceFilePattern = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const importRegex =
  /(?:import\s+(?:.+?)\s+from\s+|export\s+.+?\s+from\s+|require\()\s*["'`](.+?)["'`]\)?/g;

export const importGraphAnalyzer: RepoToolAdapter<
  typeof ImportGraphInputSchema,
  typeof ImportGraphOutputSchema
> = {
  name: "import-graph",
  description: "Builds a TS/JS import graph and infers architecture node types.",
  inputSchema: ImportGraphInputSchema,
  outputSchema: ImportGraphOutputSchema,
  async execute(input) {
    const files = input.files.filter((file) => sourceFilePattern.test(file));
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const fileSet = new Set(files);

    for (const file of files) {
      const absolutePath = path.join(input.workspacePath, file);
      const content = await fs.readFile(absolutePath, "utf8");
      const nodeKey = buildGraphNodeKey(file);

      nodes.push({
        id: `node_${slugify(file)}`,
        analysisRunId: input.analysisRunId,
        nodeKey,
        type: inferNodeType(file),
        label: path.basename(file),
        filePath: file,
        symbol: path.basename(file).replace(/\.[^.]+$/, ""),
        position: {
          x: (nodes.length % 5) * 240 + 80,
          y: Math.floor(nodes.length / 5) * 160 + 80,
        },
        metadata: {},
      });

      for (const match of content.matchAll(importRegex)) {
        const rawImport = match[1];
        if (!rawImport.startsWith(".")) {
          continue;
        }

        const resolved = path
          .normalize(path.join(path.dirname(file), rawImport))
          .replace(/\\/g, "/");
        const candidates = [
          `${resolved}.ts`,
          `${resolved}.tsx`,
          `${resolved}.js`,
          `${resolved}.jsx`,
          `${resolved}/index.ts`,
          `${resolved}/index.tsx`,
        ];
        const target = candidates.find((candidate) => fileSet.has(candidate));

        if (!target) {
          continue;
        }

        const targetNodeKey = buildGraphNodeKey(target);
        edges.push({
          id: `edge_${slugify(`${file}_${target}`)}`,
          analysisRunId: input.analysisRunId,
          edgeKey: `${nodeKey}->${targetNodeKey}:imports`,
          sourceNodeKey: nodeKey,
          targetNodeKey: targetNodeKey,
          label: "imports",
          kind: "dependency",
          metadata: { importPath: rawImport },
        });
      }
    }

    return { nodes, edges };
  },
};
