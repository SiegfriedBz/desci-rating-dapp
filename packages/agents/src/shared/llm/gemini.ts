import { geminiApiKey, geminiModel, requireEnv } from "@desci/env";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { z } from "zod";

export { DEFAULT_GEMINI_MODEL, geminiModel } from "@desci/env";

export function requireGeminiApiKey(purpose: string): string {
  return requireEnv(
    geminiApiKey,
    `GOOGLE_API_KEY (or GEMINI_API_KEY) is required for ${purpose}`
  );
}

export function resolveGeminiModel(): string {
  return geminiModel;
}

/** ChatGoogleGenerativeAI with structured Zod output (temperature 0). */
export function createStructuredGeminiModel<T extends z.ZodType>(
  schema: T,
  purpose: string
) {
  return new ChatGoogleGenerativeAI({
    model: resolveGeminiModel(),
    temperature: 0,
    apiKey: requireGeminiApiKey(purpose),
  }).withStructuredOutput(schema);
}
