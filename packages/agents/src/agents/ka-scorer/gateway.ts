import { createStructuredGeminiModel } from "../../shared/llm/gemini.js";
import { kaScoreSchema } from "./schema.js";

export function createKaScorerModel() {
  return createStructuredGeminiModel(kaScoreSchema, "KA score evaluation");
}
