# ka-scorer

Agent: score a published Target Knowledge Asset for scientific rigor (Phase-1).

## Pipeline

1. Input: RDF bindings (`TargetAssetBinding[]`) from the Target KA
2. Format triples for the prompt (drops platform PDF `schema:encoding` / `MediaObject` triples)
3. Gemini structured output → `{ score, rationale, observed[], missing[] }`
4. Caller (Inngest `phase1-requested`) mints an R-KA with `schema:description` and fulfills on-chain

## Public entrypoints

| Export | Role |
|--------|------|
| `runKaScorerAgent(bindings)` | Score + structured verdict (`agent.ts`) |
| `kaScoreSchema` / `KaScoreResult` | Zod contract |
| `formatKaScoreDescription(result)` | Rationale + observed/missing → one `schema:description` string |

Import via `@desci/agents` or `@desci/agents/ka-scorer`.

## Layout

```
ka-scorer/
  agent.ts           # runKaScorerAgent
  schema.ts          # kaScoreSchema + formatKaScoreDescription
  format-triples.ts  # serialize + drop encoding triples
  prompts.ts
  gateway.ts
  index.ts
  README.md
```

## Env

- `GOOGLE_API_KEY` or `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional; default `gemini-3.5-flash-lite`)

## Scoring notes

- Ignores PDF pin metadata (`schema:encoding`, `contentUrl`, `encodingFormat`, `MediaObject`).
- Rewards author-side `schema:distribution` and methods/materials / RRID evidence only.
- Named statistical tests are not treated as validated results (MVP heuristic).

## Not in scope

Does **not** ingest PDFs, pin/fetch IPFS, call GROBID, or publish Knowledge Assets.

- Publication ingest: `runPdfToKaAgent` in [`pdf-to-ka`](../pdf-to-ka/README.md)
- Pin / fetch PDF bytes: [`@desci/agents/ipfs`](../../ipfs/README.md)
- On-chain fulfill + R-KA mint: Inngest `phase1-requested` (wraps this agent)
