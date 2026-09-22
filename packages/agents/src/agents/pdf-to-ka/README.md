# pdf-to-ka

Agent: scientific PDF bytes + already-pinned CID → publication Target Knowledge Asset on the DKG.

## Pipeline

1. Input: `{ pdf: Uint8Array, pdfCid, contextGraphId, name?, filename? }`
2. GROBID fulltext → TEI-XML
3. Parse TEI → title / abstract / authors / kept body sections
4. Gemini structured extract → `PublicationMetadata` (`pdfCid` set from the caller)
5. Store the Target KA on the node → KA name, no UAL yet
6. Mint it → Target KA UAL

**Pinning is not part of this agent.** Callers pin first via [`@desci/agents/ipfs`](../../ipfs/README.md) (`pinPdfToIpfs`) and pass `{ pdf, pdfCid }`. The CLI and the Inngest `publish-pdf` function both do that composition.

DOI (`schema:sameAs`) is metadata only — use the content-addressed `ipfs://…` link (`schema:encoding` / `schema:contentUrl`) for PDF display/retrieval (`fetchPdfByCid`).

## Public entrypoints

| Export | Role |
|--------|------|
| `runPdfToKaAgent(input)` | Full agent (`agent.ts`) — all three stages in one call |
| `extractTeiFromPdf({ pdf, filename? })` | Stage 1: GROBID → TEI slices |
| `extractPublicationMetadata` / `publicationMetadataSchema` | Stage 2: Gemini → `PublicationMetadata` |
| `storePublicationToDkg(input)` | Stage 3a: metadata → KA quads on the node, no UAL |
| `mintPublicationToDkg(input)` | Stage 3b: stored KA → Target KA UAL |
| `publishPublicationToDkg(input)` | Stage 3: both halves in one call |
| `processPdfWithGrobid(pdf, filename?)` | GROBID → raw TEI-XML |
| `extractTeiSections` | TEI-XML → structured slices |
| `PdfToKaResult` / `StoredPublicationKa` / `RunPdfToKaAgentInput` / `PublishPublicationToDkgInput` / `MintPublicationToDkgInput` | Types |

The stages are exported separately so a caller that can retry one of them — the Inngest `publish-pdf` function — does not have to redo the others. Stage 3 is exported three ways for the same reason: `publish-pdf` runs the store and the mint as two steps, so a failed mint is retried on its own, while the CLI has no steps and wants the composite.

Pass `name` if your caller can be retried. What that buys depends on which route you are on. A stepped caller gets its guarantee from the step boundary — a retry of the mint replays the store's recorded result and re-drives `vm/publish` alone — and `mintPublicationToDkg` short-circuits to the existing UAL if the name is already minted, because a second `vm/publish` on a minted name is an error rather than a no-op. A caller of the composite gets the older guarantee instead: the daemon recognises an already-minted name and hands back its UAL.

`storePublicationToDkg` returns `{ name, subjectUri, state }` and no UAL — there is nothing anchored to name yet. `subjectUri` is in there because the mint cannot recompute it: with no DOI in the metadata it is a fresh UUID generated alongside the quads. `mintPublicationToDkg` takes it back in and returns the full `PdfToKaResult`.

Import via `@desci/agents` or `@desci/agents/pdf-to-ka`.

## Layout

```
pdf-to-ka/
  agent.ts          # runPdfToKaAgent
  index.ts          # public barrel (no pin/fetch)
  grobid/           # HTTP client + TEI parse
  extract/          # Gemini PublicationMetadata (not an agent)
  README.md
```

## CLI

```bash
pnpm dkg:publish-pdf ./paper.pdf
```

Flow: `readFile` → `pinPdfToIpfs` → `runPdfToKaAgent`. Requires `PINATA_JWT`. Sample: `packages/agents/fixtures/asx-pub.pdf`.

## Env

| Var | Role |
| --- | --- |
| `GROBID_URL` | default `http://127.0.0.1:8070` (`pnpm grobid:up`, image `grobid/grobid:0.8.2-crf`) |
| `GROBID_TIMEOUT_MS` | optional (default 120000) |
| `GOOGLE_API_KEY` | required for extract |
| `GEMINI_MODEL` | optional |
| `DKG_*` | daemon auth via `@desci/dkg-client` |

Pin / fetch (caller): `@desci/agents/ipfs` — `PINATA_JWT`, optional `IPFS_GATEWAY_URL`.

## Not in scope

Does **not** pin to Pinata, fetch from a gateway, or score rigor. Use `@desci/agents/ipfs` and `ka-scorer` for those.
