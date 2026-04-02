import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import type { GraphEdge, GraphNode } from "@/lib/contracts/domain";
import { slugify } from "@/lib/utils";

import { type RepoToolAdapter } from "./base";
import { buildGraphNodeKey, routeFileToRoutePath } from "./graph-key";

const RouteInputSchema = z.object({
  workspacePath: z.string(),
  files: z.array(z.string()),
  analysisRunId: z.string(),
});

const RouteOutputSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  routes: z.array(
    z.object({
      path: z.string(),
      method: z.string(),
      filePath: z.string(),
    }),
  ),
});

const httpMethodPattern = /\b(GET|POST|PUT|PATCH|DELETE)\b/g;
const fetchPattern = /fetch\(["'`](\/api\/[^"'`]+)["'`]/g;

export const routeExtractor: RepoToolAdapter<
  typeof RouteInputSchema,
  typeof RouteOutputSchema
> = {
  name: "route-extractor",
  description: "Finds Next.js pages, route handlers, and frontend to API fetch flows.",
  inputSchema: RouteInputSchema,
  outputSchema: RouteOutputSchema,
  async execute(input) {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const routes: { path: string; method: string; filePath: string }[] = [];
    const pageNodeKeys = new Map<string, string>();
    const routeNodeKeys = new Map<string, string>();

    for (const file of input.files) {
      if (file.endsWith("/page.tsx")) {
        const nodeKey = buildGraphNodeKey(file);
        pageNodeKeys.set(file, nodeKey);
        nodes.push({
          id: `node_${slugify(input.analysisRunId)}_${slugify(file)}`,
          analysisRunId: input.analysisRunId,
          nodeKey,
          type: "page",
          label: path.basename(path.dirname(file)),
          filePath: file,
          symbol: path.basename(file, path.extname(file)),
          position: {
            x: (nodes.length % 4) * 260 + 80,
            y: Math.floor(nodes.length / 4) * 180 + 80,
          },
          metadata: {},
        });
      }

      if (!file.endsWith("/route.ts")) {
        continue;
      }

      const absolutePath = path.join(input.workspacePath, file);
      const content = await fs.readFile(absolutePath, "utf8");
      const routePath = routeFileToRoutePath(file);
      const routeNodeKey = buildGraphNodeKey(file);
      const discoveredMethods = Array.from(new Set(content.match(httpMethodPattern) ?? []));

      routeNodeKeys.set(routePath, routeNodeKey);
      nodes.push({
        id: `node_${slugify(input.analysisRunId)}_${slugify(file)}`,
        analysisRunId: input.analysisRunId,
        nodeKey: routeNodeKey,
        type: "route",
        label: `API ${routePath}`,
        filePath: file,
        symbol: discoveredMethods.join(", "),
        position: {
          x: (nodes.length % 4) * 260 + 80,
          y: Math.floor(nodes.length / 4) * 180 + 80,
        },
        metadata: { methods: discoveredMethods },
      });

      for (const match of content.matchAll(httpMethodPattern)) {
        const method = match[1];
        routes.push({ path: routePath, method, filePath: file });
      }
    }

    for (const file of input.files.filter((item) => item.endsWith(".tsx") || item.endsWith(".ts"))) {
      const absolutePath = path.join(input.workspacePath, file);
      const content = await fs.readFile(absolutePath, "utf8");
      const pageNodeKey = pageNodeKeys.get(file);
      if (!pageNodeKey) {
        continue;
      }

      for (const match of content.matchAll(fetchPattern)) {
        const apiPath = match[1];
        const routeNodeKey = routeNodeKeys.get(apiPath);
        if (!routeNodeKey) {
          continue;
        }

        edges.push({
          id: `edge_${slugify(input.analysisRunId)}_${slugify(`${pageNodeKey}-${routeNodeKey}`)}`,
          analysisRunId: input.analysisRunId,
          edgeKey: `${pageNodeKey}->${routeNodeKey}:fetches`,
          sourceNodeKey: pageNodeKey,
          targetNodeKey: routeNodeKey,
          label: "fetches",
          kind: "request",
          metadata: {},
        });
      }
    }

    return { nodes, edges, routes };
  },
};
