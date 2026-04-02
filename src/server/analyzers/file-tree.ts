import fg from "fast-glob";
import ignore from "ignore";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import { type RepoToolAdapter } from "./base";

const FileTreeInputSchema = z.object({
  workspacePath: z.string(),
});

const FileTreeOutputSchema = z.object({
  files: z.array(z.string()),
  ignoredPatterns: z.array(z.string()),
  totalFiles: z.number().int(),
});

const defaultIgnorePatterns = [
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".git",
  "*.lock",
];

export const fileTreeAnalyzer: RepoToolAdapter<
  typeof FileTreeInputSchema,
  typeof FileTreeOutputSchema
> = {
  name: "file-crawler",
  description: "Scans the repository tree and returns source files with common ignores applied.",
  inputSchema: FileTreeInputSchema,
  outputSchema: FileTreeOutputSchema,
  async execute(input) {
    const root = path.resolve(input.workspacePath);
    const discovered = await fg(["**/*"], {
      cwd: root,
      onlyFiles: true,
      dot: true,
      absolute: false,
    });

    const gitIgnore = ignore().add(defaultIgnorePatterns);
    try {
      const gitIgnoreContent = await fs.readFile(path.join(root, ".gitignore"), "utf8");
      gitIgnore.add(gitIgnoreContent);
    } catch {
      // No-op when the imported repo has no .gitignore.
    }

    const files = discovered.filter((entry) => !gitIgnore.ignores(entry));
    return {
      files,
      ignoredPatterns: defaultIgnorePatterns,
      totalFiles: files.length,
    };
  },
};
