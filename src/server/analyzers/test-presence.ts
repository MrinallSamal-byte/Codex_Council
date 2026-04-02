import path from "path";
import { z } from "zod";

import { type RepoToolAdapter } from "./base";

const TestPresenceInputSchema = z.object({
  files: z.array(z.string()),
  targets: z.array(z.string()),
});

const TestPresenceOutputSchema = z.object({
  coverage: z.array(
    z.object({
      target: z.string(),
      matchingTests: z.array(z.string()),
    }),
  ),
});

export const testPresenceAnalyzer: RepoToolAdapter<
  typeof TestPresenceInputSchema,
  typeof TestPresenceOutputSchema
> = {
  name: "test-presence",
  description: "Checks whether high-risk modules have nearby unit or integration tests.",
  inputSchema: TestPresenceInputSchema,
  outputSchema: TestPresenceOutputSchema,
  async execute(input) {
    const coverage = input.targets.map((target) => {
      const basename = path.basename(target, path.extname(target));
      const matchingTests = input.files.filter((file) =>
        /(^|\/)(test|tests|__tests__)\//.test(file) || file.includes(`${basename}.spec.`) || file.includes(`${basename}.test.`),
      );

      return {
        target,
        matchingTests,
      };
    });

    return { coverage };
  },
};
