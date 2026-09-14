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

| Export | `id` | Config | Behavior |
| --- | --- | --- | --- |
| `phase1RequestedFunction` | `phase1-requested` | `retries: 3`, concurrency 5 global + 1 per `event.data.requestId` | fetch target KA → `runKaScorerAgent` → mint R-KA → `fulfillPhase1OnChain` |
| `publishPdfFunction` | `publish-pdf` | `retries: 2`, `timeouts.finish: "10m"` | `fetchPdfByCid` → `runPdfToKaAgent` → `{ ual, pdfCid }` |
| `phase1FulfilledLogFunction` | `phase1-fulfilled-log` | `retries: 2` | log-only |
| `requestCancelledLogFunction` | `request-cancelled-log` | `retries: 2` | log-only |
| `oracleUpdatedLogFunction` | `oracle-updated-log` | `retries: 2` | log-only |

`phase1-requested` steps: `fetch-target-ka` → `run-ka-scorer-agent` → `mint-r-ka` → `fulfill-on-chain`. It rethrows `TargetAssetNotIndexedError` so Inngest retries through DKG indexing lag, and `fulfillPhase1OnChain` returns `already_fulfilled` without a tx when the record is already `Phase1Completed`.

`publish-pdf` steps: `fetch-pdf` (bytes returned base64-encoded so they survive Inngest's JSON step boundary) → `run-pdf-to-ka-agent`.

Both DKG functions resolve the context graph through `requireDkgContextGraphId`, so `DKG_CONTEXT_GRAPH_ID` must be set.

## Dev-only flag

`DEV_SKIP_DKG_MINT="true"` makes `mint-r-ka` skip `publishRating` (which needs a 3-peer DKG write quorum) and return a synthetic UAL — `did:dkg:base:84532/dev-skip-dkg/{requestId slice}` — so scoring and the on-chain fulfill still run end to end. Development only; there is no guard against enabling it elsewhere.

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
