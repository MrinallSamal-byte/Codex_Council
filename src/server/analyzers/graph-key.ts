import { slugify } from "@/lib/utils";

import type { GraphNode } from "@/lib/contracts/domain";

export function inferNodeType(filePath: string): GraphNode["type"] {
  if (filePath.includes("/app/") && filePath.endsWith("/page.tsx")) {
    return "page";
  }
  if (filePath.includes("/api/") && filePath.endsWith("/route.ts")) {
    return "route";
  }
  if (filePath.includes("/service")) {
    return "service";
  }
  if (filePath.includes("/model")) {
    return "model";
  }
  if (filePath.includes("/auth")) {
    return "auth";
  }
  if (filePath.includes("/jobs") || filePath.includes("/cron")) {
    return "job";
  }
  if (filePath.includes("config") || filePath.endsWith("env.ts")) {
    return "config";
  }
  return "module";
}

export function routeFileToRoutePath(filePath: string) {
  return filePath
    .replace(/^src\/app/, "")
    .replace(/\/route\.(ts|js)$/, "")
    .replace(/\[(.+?)\]/g, ":$1");
}

export function buildGraphNodeKey(filePath: string) {
  const type = inferNodeType(filePath);
  if (type === "route") {
    return `${type}:${slugify(routeFileToRoutePath(filePath))}`;
  }
  return `${type}:${slugify(filePath)}`;
}
