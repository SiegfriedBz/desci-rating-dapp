import { z } from "zod";

export const kaScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
  observed: z.array(z.string()),
  missing: z.array(z.string()),
});

export type KaScoreResult = z.infer<typeof kaScoreSchema>;

/** Format a structured verdict into one schema:description literal for the R-KA. */
export function formatKaScoreDescription(result: KaScoreResult): string {
  const observed =
    result.observed.length > 0
      ? result.observed.map((item) => `- ${item}`).join("\n")
      : "- (none)";
  const missing =
    result.missing.length > 0
      ? result.missing.map((item) => `- ${item}`).join("\n")
      : "- (none)";

  return [
    result.rationale.trim(),
    "",
    "Observed:",
    observed,
    "",
    "Missing:",
    missing,
  ].join("\n");
}
