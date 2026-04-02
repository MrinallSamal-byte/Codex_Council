import OpenAI from "openai";
import { z } from "zod";

import { env, runtimeCapabilities } from "@/env";
import type { ModelAttempt, ModelSetting } from "@/lib/contracts/domain";

let client: OpenAI | null = null;

function getClient() {
  if (!runtimeCapabilities.hasOpenRouter) {
    return null;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "RepoCouncil",
      },
    });
  }

  return client;
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]+?)```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

export async function generateStructuredOutput<T>({
  schema,
  systemPrompt,
  userPrompt,
  setting,
}: {
  schema: z.ZodSchema<T>;
  systemPrompt: string;
  userPrompt: string;
  setting: ModelSetting;
}): Promise<{ output: T; model: string; provider: string; attempts: ModelAttempt[] }> {
  const attempts: ModelAttempt[] = [];
  const openRouter = getClient();
  if (!openRouter) {
    throw Object.assign(new Error("OpenRouter is not configured"), {
      attempts: [
        {
          model: setting.model,
          provider: setting.provider,
          status: "skipped" as const,
          error: "OPENROUTER_API_KEY is missing.",
        },
      ],
    });
  }

  const candidates = [setting.model, ...setting.fallbackModels].filter(Boolean);

  for (const model of candidates) {
    try {
      const request = {
        model,
        temperature: setting.temperature,
        max_tokens: setting.maxTokens ?? 1800,
        provider: {
          allow_fallbacks: true,
        },
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\nReturn only valid JSON.`,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
        provider: {
          allow_fallbacks: boolean;
        };
      };

      const response = await openRouter.chat.completions.create(request as never);

      const content = response.choices[0]?.message?.content ?? "{}";
      const output = schema.parse(JSON.parse(extractJson(content)));
      const resolvedModel = response.model ?? model;
      return {
        output,
        model: resolvedModel,
        provider: setting.provider,
        attempts: [
          ...attempts,
          {
            model: resolvedModel,
            provider: setting.provider,
            status: "success",
          },
        ],
      };
    } catch (error) {
      attempts.push({
        model,
        provider: setting.provider,
        status: "failed",
        error: error instanceof Error ? error.message : "Model execution failed.",
      });
      continue;
    }
  }

  throw Object.assign(new Error(`All configured models failed for ${setting.agentName}`), {
    attempts,
  });
}
