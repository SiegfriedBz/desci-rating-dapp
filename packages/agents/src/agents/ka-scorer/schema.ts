import { z } from "zod";

export const kaScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
  observed: z.array(z.string()),
  missing: z.array(z.string()),
});

export type KaScoreResult = z.infer<typeof kaScoreSchema>;
