import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import type { TargetAssetBinding } from "@desci/dkg-client";

export const sciScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  rigor: z.string().min(1),
});

export type SciScoreResult = z.infer<typeof sciScoreSchema>;

/** Free-tier Gemini Flash Lite; override with GEMINI_MODEL if needed. */
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const SciScoreState = Annotation.Root({
  bindings: Annotation<TargetAssetBinding[]>,
  score: Annotation<number>,
  rigor: Annotation<string>,
});

function requireGeminiApiKey(): string {
  const key =
    process.env["GOOGLE_API_KEY"] ?? process.env["GEMINI_API_KEY"] ?? "";
  if (!key.trim()) {
    throw new Error(
      "GOOGLE_API_KEY (or GEMINI_API_KEY) is required for SciScore evaluation"
    );
  }
  return key.trim();
}

function formatTriples(bindings: TargetAssetBinding[]): string {
  return bindings
    .map(
      (b) =>
        `<${b.subject}> <${b.predicate}> ${
          b.object.startsWith("http") || b.object.startsWith("urn:")
            ? `<${b.object}>`
            : JSON.stringify(b.object)
        } .`
    )
    .join("\n");
}

async function evaluateNode(
  state: typeof SciScoreState.State
): Promise<Partial<typeof SciScoreState.State>> {
  const modelName = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_GEMINI_MODEL;
  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    temperature: 0,
    apiKey: requireGeminiApiKey(),
  }).withStructuredOutput(sciScoreSchema);

  const triples = formatTriples(state.bindings);
  const result = await model.invoke([
    {
      role: "system",
      content: `You are a DeSci Phase-1 SciScore evaluator. Score scientific rigor of a publication Knowledge Asset from 0–100 based on RDF triples.

Consider indicators such as:
- Cell line authentication / STR profiling
- RRIDs (research resource identifiers)
- Randomization / blinding
- Sample size / statistical methods
- Data / code availability statements
- Conflict of interest / funding disclosures

Return an integer score in [0, 100] and a short rigor rationale.`,
    },
    {
      role: "user",
      content: `Evaluate the following RDF triples:\n\n${triples}`,
    },
  ]);

  const parsed = sciScoreSchema.parse(result);
  return { score: parsed.score, rigor: parsed.rigor };
}

const sciScoreGraph = new StateGraph(SciScoreState)
  .addNode("evaluate", evaluateNode)
  .addEdge(START, "evaluate")
  .addEdge("evaluate", END)
  .compile();

/**
 * Structured SciScore evaluation over RDF triples from the target Knowledge Asset.
 */
export async function runSciScoreAgent(
  bindings: TargetAssetBinding[]
): Promise<SciScoreResult> {
  const result = await sciScoreGraph.invoke({
    bindings,
    score: 0,
    rigor: "",
  });
  return sciScoreSchema.parse({
    score: result.score,
    rigor: result.rigor,
  });
}
