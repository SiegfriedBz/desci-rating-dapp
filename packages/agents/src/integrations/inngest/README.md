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
| `phase1RequestedFunction` | `phase1-requested` | `retries: 3`, concurrency 5 global + 1 per `event.data.requestId` | fetch target KA → `runKaScorerAgent` → store R-KA → mint R-KA → `fulfillPhase1OnChain` |
| `publishPdfFunction` | `publish-pdf` | `retries: 2`, `timeouts.finish: "20m"` | GROBID → Gemini → store publication KA → mint it → `{ ual, pdfCid }` |
| `phase1FulfilledLogFunction` | `phase1-fulfilled-log` | `retries: 2` | log-only |
| `requestCancelledLogFunction` | `request-cancelled-log` | `retries: 2` | log-only |
| `oracleUpdatedLogFunction` | `oracle-updated-log` | `retries: 2` | log-only |

`phase1-requested` steps: `fetch-target-ka` → `run-ka-scorer-agent` → `dkg-store-rating-ka` → `dkg-mint-rating-ka` → `fulfill-on-chain`. It rethrows `TargetAssetNotIndexedError` so Inngest retries through DKG indexing lag, and `fulfillPhase1OnChain` returns `already_fulfilled` without a tx when the record is already `Phase1Completed`.

`dkg-store-rating-ka` passes the scorer's verdict to `storeRating` as structured fields: `rationale` becomes `schema:description`, and `observed` / `missing` become repeated `desci:observedEvidence` / `desci:missingEvidence` literals. It returns `{ name, ratingSubject }` and not the quads, which stay inside the step. `ratingSubject` has to cross the boundary because it is a fresh UUID generated alongside those quads: the mint cannot re-derive it from the name, and reads it out of this step's saved output. `dkg-mint-rating-ka` then returns `{ rKaUal, ratingSubject }`, because `fulfill-on-chain` reads `minted.rKaUal`.

`dkg-store-rating-ka` names the asset `desci-rating-<requestId>-<transactionHash>`. A retry of the mint does not re-store at all — Inngest replays this step's saved result — so converging on one R-KA no longer rests on the daemon recognising a name. The name still covers the two cases that do reach the daemon twice: a store attempt following a lost response, and a second Alchemy delivery of the same log, both of which the daemon answers “already exists” to. The transaction hash is in the name, and not just `requestId`, because `requestId` is `keccak256(targetUal)`: it is the same value after `cancelPendingRequest` and a fresh `requestPhase1` on that UAL, and that second run scores the paper again, so it has to mint its own R-KA rather than record a new score against one holding the old score. That is the one case where a paper ends up with two R-KAs — the first is orphaned in the graph and the catalog shows the newer one. `logIndex` is not needed — two `requestPhase1` calls in one transaction must carry two different UALs, since the same UAL twice reverts with `AlreadyPending`.

`publish-pdf` steps: `grobid-extract` (fetches the pinned PDF, returns TEI slices) → `gemini-structure` → `dkg-store-target-ka` → `dkg-mint-target-ka`. One stage per step, so a retry of the mint does not pay for GROBID and Gemini again — and no longer pays for the store either, now that the mint is a step of its own. No step carries the PDF bytes or the KA quads across the JSON boundary.

`timeouts.finish` is load-bearing outside this package. `PUBLISH_JOB_TTL_MS` in `apps/web` expires the event id the Publish modal persists, and it is set to the same 20 minutes so that a restored id cannot name a run that is no longer able to be alive. Nothing enforces the pairing but this paragraph: shortening the finish window alone leaves the modal resuming a poll against a dead job, and lengthening it alone drops a live one. They are two clocks started at different moments — the id is saved when `uploadAndPin` returns, the timeout starts when Inngest picks the run up — so the fix is a shared bound with an explicit margin, not one constant used twice.

`dkg-store-target-ka` names the asset `desci-pub-<event id>` and returns `{ name, subjectUri, state }` — no UAL, because nothing is on chain until `dkg-mint-target-ka`. `subjectUri` crosses the boundary for the same reason `ratingSubject` does on the rating side: with no DOI in the metadata it is a fresh UUID minted with the graph. A store attempt following a lost response is recognised by name; a retry of the mint replays the store and re-drives `vm/publish` alone, which short-circuits to the existing UAL when the name is already minted — a second `vm/publish` on a minted name is an error, not a no-op. A name the daemon cannot find at all fails the step loudly rather than storing again, because the store's success is already recorded and cannot be re-executed. A new submission is a new event, so a deliberate republish still mints a fresh UAL — which `queryPublicationsWithRatings` depends on.

A step's work runs inside one request to `/api/inngest`, so `maxDuration` on that route has to clear the slowest step. Splitting each DKG publish into a store step and a mint step is what makes that cap survivable: the two daemon calls used to share one 300 s window and now get one each. It does not make the publish faster — the mint is the slow half either way — but it is what a poll or a longer wait can be built on.

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
