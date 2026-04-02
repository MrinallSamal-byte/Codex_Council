import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import { type RepoToolAdapter } from "./base";

const FrameworkInputSchema = z.object({
  workspacePath: z.string(),
});

const FrameworkOutputSchema = z.object({
  framework: z.string(),
  language: z.string(),
  runtime: z.string(),
  packageManager: z.string(),
  database: z.string().optional(),
  signals: z.array(z.string()),
});

export const frameworkDetector: RepoToolAdapter<
  typeof FrameworkInputSchema,
  typeof FrameworkOutputSchema
> = {
  name: "framework-detector",
  description: "Detects the primary stack and framework from package manifests and config files.",
  inputSchema: FrameworkInputSchema,
  outputSchema: FrameworkOutputSchema,
  async execute(input) {
    const workspacePath = path.resolve(input.workspacePath);
    const pkgPath = path.join(workspacePath, "package.json");
    const packageJson = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    const signals: string[] = [];
    let framework = "Node.js";
    let database = "Unknown";

    if (dependencies.next) {
      framework = "Next.js";
      signals.push("package.json includes next");
    } else if (dependencies.express) {
      framework = "Express";
      signals.push("package.json includes express");
    } else if (dependencies.nestjs || dependencies["@nestjs/core"]) {
      framework = "NestJS";
      signals.push("package.json includes NestJS");
    }

    if (dependencies.prisma || dependencies["@prisma/client"]) {
      database = "Prisma";
      signals.push("package.json includes prisma");
    } else if (dependencies.mongoose) {
      database = "MongoDB";
      signals.push("package.json includes mongoose");
    }

    const packageManager = (await Promise.any([
      fs
        .access(path.join(workspacePath, "pnpm-lock.yaml"))
        .then(() => "pnpm"),
      fs
        .access(path.join(workspacePath, "yarn.lock"))
        .then(() => "yarn"),
      fs
        .access(path.join(workspacePath, "package-lock.json"))
        .then(() => "npm"),
    ]).catch(() => "unknown")) as string;

    return {
      framework,
      language: "TypeScript/JavaScript",
      runtime: "Node.js",
      packageManager,
      database,
      signals,
    };
  },
};
