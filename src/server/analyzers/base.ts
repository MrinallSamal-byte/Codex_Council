import { z } from "zod";

export type RepoToolAdapter<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny,
> = {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>;
  capabilities?: {
    requiresBinary?: string;
    supportsIncremental?: boolean;
  };
};

export type ToolAdapterMap = Record<string, RepoToolAdapter<z.ZodTypeAny, z.ZodTypeAny>>;
