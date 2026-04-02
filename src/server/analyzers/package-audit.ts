import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import { type RepoToolAdapter } from "./base";

const PackageAuditInputSchema = z.object({
  workspacePath: z.string(),
});

const PackageAuditOutputSchema = z.object({
  packageManager: z.string(),
  dependencyCount: z.number().int(),
  advisories: z.array(
    z.object({
      package: z.string(),
      note: z.string(),
    }),
  ),
});

export const packageAuditAnalyzer: RepoToolAdapter<
  typeof PackageAuditInputSchema,
  typeof PackageAuditOutputSchema
> = {
  name: "package-audit",
  description: "Performs a lightweight dependency audit based on manifest inspection.",
  inputSchema: PackageAuditInputSchema,
  outputSchema: PackageAuditOutputSchema,
  async execute(input) {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(input.workspacePath, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };
    const advisories = Object.keys(dependencies)
      .filter((name) => ["jsonwebtoken", "node-fetch", "lodash"].includes(name))
      .map((name) => ({
        package: name,
        note: "Review version currency and known security advisories for this package.",
      }));

    return {
      packageManager: "unknown",
      dependencyCount: Object.keys(dependencies).length,
      advisories,
    };
  },
};
