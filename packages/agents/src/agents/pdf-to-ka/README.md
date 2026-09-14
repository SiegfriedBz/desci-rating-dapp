# pdf-to-ka

Agent: scientific PDF bytes + already-pinned CID → publication Target Knowledge Asset on the DKG.

## Pipeline

1. Input: `{ pdf: Uint8Array, pdfCid, contextGraphId, name?, filename? }`
2. GROBID fulltext → TEI-XML
3. Parse TEI → title / abstract / authors / kept body sections
4. Gemini structured extract → `PublicationMetadata` (`pdfCid` set from the caller)
5. `publishPublication` → Target KA UAL

**Pinning is not part of this agent.** Callers pin first via [`@desci/agents/ipfs`](../../ipfs/README.md) (`pinPdfToIpfs`) and pass `{ pdf, pdfCid }`. The CLI does that composition; a future server action / Inngest job should too.

DOI (`schema:sameAs`) is metadata only — use the content-addressed `ipfs://…` link (`schema:encoding` / `schema:contentUrl`) for PDF display/retrieval (`fetchPdfByCid`).

## Public entrypoints

| Export | Role |
|--------|------|
| `runPdfToKaAgent(input)` | Full agent (`agent.ts`) |
| `processPdfWithGrobid(pdf, filename?)` | GROBID → TEI-XML |
| `extractTeiSections` | TEI-XML → structured slices |
| `extractPublicationMetadata` / `publicationMetadataSchema` | Gemini → `PublicationMetadata` |
| `PdfToKaResult` / `RunPdfToKaAgentInput` | Types |

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
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | required for extract |
| `GEMINI_MODEL` | optional |
| `DKG_*` | daemon auth via `@desci/dkg-client` |

Pin / fetch (caller): `@desci/agents/ipfs` — `PINATA_JWT`, optional `IPFS_GATEWAY_URL`.

## Not in scope

Does **not** pin to Pinata, fetch from a gateway, or score rigor. Use `@desci/agents/ipfs` and `ka-scorer` for those.
