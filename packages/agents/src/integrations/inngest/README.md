# integrations/inngest

Inngest client, event schemas, Alchemy log adapter, and durable functions for RatingController Phase-1 + PDF→KA publish.

Import via `@desci/agents/inngest`. Functions are registered in `apps/web/src/app/api/inngest/route.ts`.

## Events (`InngestEvent`)

| Enum | Event name | Produced by |
| --- | --- | --- |
| `Phase1Requested` | `RatingController/phase1.requested` | Alchemy webhook → `processRatingControllerEvent` |
| `Phase1Fulfilled` | `RatingController/phase1.fulfilled` | same |
| `RequestCancelled` | `RatingController/request.cancelled` | same |
| `OracleUpdated` | `RatingController/oracle.updated` | same |
| `PdfSubmitted` | `pdf.submitted` | `uploadAndPin` in `apps/web` |

## Functions

| Export | `id` | Behavior |
| --- | --- | --- |
| `phase1RequestedFunction` | `phase1-requested` | fetch target KA → `runKaScorerAgent` → mint R-KA → `fulfillPhase1OnChain` |
| `publishPdfFunction` | `publish-pdf` | `fetchPdfByCid` → `runPdfToKaAgent` → `{ ual, pdfCid }` |
| `phase1FulfilledLogFunction` | (log) | log-only |
| `requestCancelledLogFunction` | (log) | log-only |
| `oracleUpdatedLogFunction` | (log) | log-only |

## Layout

```
inngest/
  client.ts                              # Inngest app id + Zod event schemas
  index.ts                               # public barrel
  adapters/
    rating-controller-event.ts           # decoded contract log → Inngest.send
  functions/
    phase1-requested.ts                  # real Phase-1 pipeline
    publish-pdf.ts                       # PDF CID → Target KA
    log-contract-event.ts                # fulfilled / cancelled / oracle updated
  README.md
```

## Local dev

Repo root: `pnpm inngest:dev` → Dev Server talks to `http://localhost:3000/api/inngest`.

Env (via `@desci/env`): `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, optional `INNGEST_API_BASE_URL`. Phase-1 also needs DKG + oracle EVM vars (see [`../evm/README.md`](../evm/README.md)). Publish-PDF needs Pinata/gateway + `DKG_CONTEXT_GRAPH_ID` + Gemini/GROBID as for pdf-to-ka.
