import type { TargetAssetBinding } from "@desci/dkg-client";
import { formatTriples } from "./format-triples.js";
import { createKaScorerModel } from "./gateway.js";
import {
  KA_SCORER_SYSTEM_PROMPT,
  buildKaScorerUserMessage,
} from "./prompts.js";
import { kaScoreSchema, type KaScoreResult } from "./schema.js";

/**
 * Structured Phase-1 score evaluation over RDF triples from the target Knowledge Asset.
 * Single-step Gemini call (no LangGraph — one evaluate node only).
 */
export async function runKaScorerAgent(
  bindings: TargetAssetBinding[]
): Promise<KaScoreResult> {
  const model = createKaScorerModel();
  const triples = formatTriples(bindings);
  const result = await model.invoke([
    {
      role: "system",
      content: KA_SCORER_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildKaScorerUserMessage(triples),
    },
  ]);

  return kaScoreSchema.parse(result);
}
