import { execFile } from "child_process";
import { promisify } from "util";
import { z } from "zod";

import { type RepoToolAdapter } from "./base";

const execFileAsync = promisify(execFile);

const SemgrepInputSchema = z.object({
  workspacePath: z.string(),
});

const SemgrepOutputSchema = z.object({
  enabled: z.boolean(),
  findings: z.array(z.any()),
  note: z.string().optional(),
});

export const semgrepAnalyzer: RepoToolAdapter<
  typeof SemgrepInputSchema,
  typeof SemgrepOutputSchema
> = {
  name: "semgrep",
  description: "Runs Semgrep when available and returns parsed findings.",
  inputSchema: SemgrepInputSchema,
  outputSchema: SemgrepOutputSchema,
  capabilities: {
    requiresBinary: "semgrep",
  },
  async execute(input) {
    try {
      const { stdout } = await execFileAsync("semgrep", [
        "--json",
        "--config",
        "p/owasp-top-ten",
        input.workspacePath,
      ]);
      const parsed = JSON.parse(stdout) as { results?: unknown[] };
      return {
        enabled: true,
        findings: parsed.results ?? [],
      };
    } catch {
      return {
        enabled: false,
        findings: [],
        note: "Semgrep binary was not available in the current runtime.",
      };
    }
  },
};
