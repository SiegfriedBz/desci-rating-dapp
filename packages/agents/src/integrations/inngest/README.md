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
| `publishPdfFunction` | `publish-pdf` | `retries: 2`, `timeouts.finish: "20m"` | GROBID → Gemini → publication KA → `{ ual, pdfCid }` |
| `phase1FulfilledLogFunction` | `phase1-fulfilled-log` | `retries: 2` | log-only |
| `requestCancelledLogFunction` | `request-cancelled-log` | `retries: 2` | log-only |
| `oracleUpdatedLogFunction` | `oracle-updated-log` | `retries: 2` | log-only |

`phase1-requested` steps: `fetch-target-ka` → `run-ka-scorer-agent` → `mint-r-ka` → `fulfill-on-chain`. It rethrows `TargetAssetNotIndexedError` so Inngest retries through DKG indexing lag, and `fulfillPhase1OnChain` returns `already_fulfilled` without a tx when the record is already `Phase1Completed`.

`mint-r-ka` passes the scorer's verdict to `publishRating` as structured fields: `rationale` becomes `schema:description`, and `observed` / `missing` become repeated `desci:observedEvidence` / `desci:missingEvidence` literals. The step keeps returning `{ rKaUal, ratingSubject }` because `fulfill-on-chain` reads `minted.rKaUal`.

`publish-pdf` steps: `grobid-extract` (fetches the pinned PDF, returns TEI slices) → `gemini-structure` → `dkg-publish`. One stage per step, so a retry of the mint does not pay for GROBID and Gemini again, and no step carries the PDF bytes across the JSON boundary.

`dkg-publish` names the asset `desci-pub-<event id>`. The daemon returns the UAL of an already-published name instead of minting, so a retry that follows a lost response reuses the first asset rather than duplicating it. A new submission is a new event, so a deliberate republish still mints a fresh UAL — which `queryPublicationsWithRatings` depends on.

A step's work runs inside one request to `/api/inngest`, so `maxDuration` on that route has to clear the slowest step.

Both DKG functions read `env.DKG_CONTEXT_GRAPH_ID`, which `@desci/env` requires.

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

Env: `INNGEST_SIGNING_KEY` and optional `INNGEST_API_BASE_URL` via `@desci/env`; `INNGEST_EVENT_KEY` is read by the Inngest SDK from `process.env` (not declared in the catalog). Phase-1 also needs DKG + oracle EVM vars (see [`../evm/README.md`](../evm/README.md)). Publish-PDF needs Pinata/gateway + `DKG_CONTEXT_GRAPH_ID` + Gemini/GROBID as for pdf-to-ka.
