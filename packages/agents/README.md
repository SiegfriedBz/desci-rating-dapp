# `@desci/agents`

Two agents plus shared IPFS helpers and Inngest/EVM wiring for `RatingController`.

| Agent | Entry | Role |
| --- | --- | --- |
| `pdf-to-ka` | `runPdfToKaAgent` | PDF bytes + CID → publication Target KA |
| `ka-scorer` | `runKaScorerAgent` | Target KA RDF → score + structured verdict |

Package scripts: `pnpm --filter @desci/agents build` (`tsc` → `dist/`) and `clean`.

## Exports

| Import | Source |
| --- | --- |
| `@desci/agents` | `src/index.ts` — both agents + GROBID/extract helpers |
| `@desci/agents/pdf-to-ka` | `src/agents/pdf-to-ka` |
| `@desci/agents/ka-scorer` | `src/agents/ka-scorer` |
| `@desci/agents/ipfs` | `src/ipfs` — Pinata pin + gateway fetch (not an agent) |
| `@desci/agents/inngest` | `src/integrations/inngest` |

## Architecture notes

- **Agents** live under `src/agents/<name>/` with an `agent.ts` exporting `runXxxAgent`.
- **IPFS** is a sibling module (`@desci/agents/ipfs`). Callers pin (or later fetch) outside the agent, then pass `{ pdf, pdfCid }` into `runPdfToKaAgent`.
- **LLM**: LangChain `ChatGoogleGenerativeAI` + Zod structured output (`src/shared/llm/gemini.ts`). No LangGraph.
- **Durable jobs**: Inngest under `src/integrations/` (Phase-1 RatingController only for now).

Depends on `@desci/dkg-client` for daemon publish/query. Gemini: `GOOGLE_API_KEY` or `GEMINI_API_KEY`; optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). Pin: `PINATA_JWT`. Fetch: `IPFS_GATEWAY_URL` (e.g. Pinata gateway). The KA stores `ipfs://…` on `schema:encoding` / `schema:contentUrl`.

## Composition (CLI today)

```
readFile(path) → pinPdfToIpfs(bytes) → runPdfToKaAgent({ pdf, pdfCid, contextGraphId })
```

Later (upload / Inngest): pin or `fetchPdfByCid` in the caller, then the same `runPdfToKaAgent`.

## Folders

### `src/`

Root barrel: `runPdfToKaAgent`, `runKaScorerAgent`, GROBID/extract helpers, KA score types. IPFS and Inngest are separate export paths.

### `src/agents/pdf-to-ka/`

See [src/agents/pdf-to-ka/README.md](src/agents/pdf-to-ka/README.md).

- `agent.ts` — `runPdfToKaAgent({ pdf, pdfCid, contextGraphId, name?, filename? })`
- `grobid/` — `processPdfWithGrobid(pdf: Uint8Array, filename?)` + TEI parse
- `extract/` — Gemini → `PublicationMetadata` (no scores/rigor)

### `src/agents/ka-scorer/`

See [src/agents/ka-scorer/README.md](src/agents/ka-scorer/README.md).

- `agent.ts` — `runKaScorerAgent(bindings)`
- `schema.ts` — `{ score, rationale, observed, missing }` + `formatKaScoreDescription`

### `src/ipfs/`

See [src/ipfs/README.md](src/ipfs/README.md). Shared storage: `pinPdfToIpfs`, `fetchPdfByCid`, `ipfsUriForCid` / `bareCid`.

### `src/shared/llm/`

`gemini.ts` — `createStructuredGeminiModel`, `requireGeminiApiKey`, `resolveGeminiModel`.

### `src/integrations/inngest/`

App id `desci-rating-dapp`. Events: `RatingController/phase1.requested|fulfilled`, `request.cancelled`, `oracle.updated`.

- `adapters/rating-controller-event.ts` — decoded log → Inngest events
- `functions/phase1-requested.ts` — fetch KA → `runKaScorerAgent` → mint R-KA (`schema:description`) → `fulfillPhase1OnChain`
- `functions/log-contract-event.ts` — log-only handlers

Repo-root `pnpm inngest:dev` → `http://localhost:3000/api/inngest`.

### `src/integrations/evm/`

`fulfillPhase1OnChain` — Viem wallet on Base Sepolia. Requires `ORACLE_AGENT_PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL`.

### `scripts/` / `fixtures/`

`scripts/publish-pdf.ts` — `readFile` → `pinPdfToIpfs` → `runPdfToKaAgent`.

```bash
pnpm dkg:publish-pdf ./paper.pdf
# or DKG_PDF_PATH=...
```

Requires `PINATA_JWT`. Optional `DKG_CONTEXT_GRAPH_ID` (default `desci-sample`), `DKG_KA_NAME`. Sample PDF: `fixtures/asx-pub.pdf`.

GROBID sidecar: repo-root `pnpm grobid:up` / `grobid:down` (`docker-compose.grobid.yml`, CPU-only `grobid/grobid:0.8.2-crf`). Ready when `curl -s http://127.0.0.1:8070/api/isalive` returns `true`.
