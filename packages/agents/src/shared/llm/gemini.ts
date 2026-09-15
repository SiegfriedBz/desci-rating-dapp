import { env } from "@desci/env";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { z } from "zod";

/** ChatGoogleGenerativeAI with structured Zod output (temperature 0). */
export function createStructuredGeminiModel<T extends z.ZodType>(schema: T) {
  return new ChatGoogleGenerativeAI({
    model: env.GEMINI_MODEL,
    temperature: 0,
    apiKey: env.GOOGLE_API_KEY,
  }).withStructuredOutput(schema);
}
