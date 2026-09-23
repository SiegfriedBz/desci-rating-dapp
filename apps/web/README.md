# `web` (VeriSci)

Next.js 16 App Router dapp for the desci-rating-dapp monorepo. It is the UI for both product flows (publish a Knowledge Asset, request a Phase-1 rating) **and** the host for the Alchemy webhook and the Inngest worker endpoint.

The workspace package name is **`web`**, not `@desci/web`. Run it from the repo root:

```bash
pnpm dev            # turbo run dev → next dev on :3000
pnpm --filter web build
pnpm --filter web lint
```

> The app is deployed on Vercel against a hosted DKG node, GROBID, and Inngest Cloud. For **local** development it needs the local stack running: DKG daemon (`pnpm dkg:start`), GROBID (`pnpm grobid:up`), and the Inngest Dev Server (`pnpm inngest:dev`). See the [root README](../../README.md#local-development).

## Routes

| Route | File | Notes |
|---|---|---|
| `/` | `src/app/(landing)/page.tsx` | Hero, KA catalog, how-it-works, both flow explainers, roadmap. `dynamic = "force-dynamic"` |
| `/rate-ka` | `src/app/rate-ka/page.tsx` | Eligible-KA table + paste-a-UAL field + wallet `requestPhase1`. `dynamic = "force-dynamic"` |
| `/api/inngest` | `src/app/api/inngest/route.ts` | `GET` / `POST` / `PUT` via `inngest/next` `serve`. Registers all 5 functions from `@desci/agents/inngest` |
| `/api/webhooks/alchemy` | `src/app/api/webhooks/alchemy/route.ts` | `POST`, `runtime = "nodejs"`. HMAC-verifies the raw body, filters logs to the `RatingController` address, decodes them with `ratingControllerAbi`, and dispatches Inngest events |

Layout (`src/app/layout.tsx`) wraps every page in `AppKitProvider` with a shared `SiteHeader` and `Footer`, and passes the request cookie header through for wagmi SSR hydration.

## Server data access

All DKG and on-chain reads happen on the server. `src/lib/evm-client.ts` and `src/lib/dkg-availability.ts` are marked `server-only`; the Base Sepolia RPC URL is never exposed to the browser.

| Module | Exports | Role |
|---|---|---|
| `lib/dkg-availability.ts` | `getDkgAvailability` | One cheap `probeDkgDaemon` per request, wrapped in React `cache()`. Gates the catalog and the Publish button, and returns a generic user-facing message rather than leaking probe internals |
| `lib/queries/dkg/kas.ts` | `getKas`, `queryKas` | `queryPublicationsWithRatings` SPARQL, newest-first by token id, capped at `LANDING_KA_CATALOG_LIMIT` (12). Rows with no rating in SPARQL fall back to an on-chain `getRatingByUal` multicall, so scores still appear during DKG sync lag |
| `lib/queries/contract/ratings.ts` | `getRatingByUal`, `queryRatingByUal`, `getUnratedKas`, `queryUnratedKas` | Single-UAL read, plus the `/rate-ka` list filtered to `phase === Unrated` (pending rows kept so users can see their in-flight request) |
| `lib/queries/dkg/publish-status.ts` | `getPublishStatus` | Polls the Inngest REST API (`/v1/events/{id}/runs`) and maps run status to `PublishJobStatus` |
| `lib/commands/dkg/publish-ka.ts` | `uploadAndPin` | Server action: validate PDF → `pinPdfToIpfs` → `inngest.send(pdf.submitted)` → return the event id |
| `lib/evm-client.ts` | `getEvmClient` | Lazy cached viem public client for Base Sepolia |

Each `get*` throws so server components can render an unavailable state; the paired `query*` wrapper never throws and is what TanStack Query calls on refetch.

## Components

```
components/
  header/        SiteHeader (nav → /rate-ka) + WalletControls
  footer/        RatingController link to Basescan + optional contact links
  landing/       Hero, FlowPublishKa, FlowRateKa, Roadmap
  ka-catalog/    Landing table — Title / KA UAL / Score / R-KA UAL
  publish/       Publish KA button → modal → file form → progress → success
  rate-ka/       Eligible-KA table, UalPasteField, RequestPhase1Button, OracleRequestStatus
  ui/            shadcn-style primitives (see components.json)
```

**Publish KA** (`publish/use-publish-ka.ts`): the modal accepts a PDF up to 5 MB (`MAX_PDF_BYTES`, enforced in both the UI and the server action), calls `uploadAndPin`, then polls run status every 3 s (`PUBLISH_STATUS_POLL_MS`) until the Inngest job returns the UAL, and invalidates the catalog query on success. No wallet is involved — the DKG daemon signs the KA mint.

The poll survives two kinds of non-answer: Inngest reporting no run yet (`PUBLISH_STATUS_GRACE_TICKS`) and the read itself throwing, which covers every non-OK HTTP status as well as transport failure (`PUBLISH_STATUS_ERROR_GRACE_TICKS`, two minutes at the 3 s interval). Past either threshold the modal enters `Error` — and `Error` is not one state. `PublishErrorAction` splits it by what is known to be running, since a second publish sends a second `pdf.submitted` under a fresh `desci-pub-*` name and mints a second Target KA for the same paper:

| Action | Reached by | Offers |
|---|---|---|
| `Retry` | no `eventId` — the upload or the `send()` failed | Publish again, PDF still selected |
| `Resume` | the poll gave up without a verdict | "Resume checking" — `startPolling(eventId)` again |
| `None` | Inngest returned `Failed` or `Cancelled` | only Clear, which resets and re-arms Publish |

`canSubmit` therefore requires `eventId == null`, and so does the `Error → Idle` recovery in `onFileChange`: with a job in flight, picking a new file must not re-arm Publish. The action is derived from `eventId` and `watchLost` rather than stored, so no stale flag can offer `Resume` once the event id is gone.

**Request Phase 1** (`rate-ka/use-request-phase1.ts`): requires a connected wallet on chain `84532`, then `simulateContract` → `writeContract` → `useWaitForTransactionReceipt`. The transaction must be signed by the user so that `msg.sender` is recorded as the requester. Contract reverts are mapped to readable copy (`AlreadyPending`, `InvalidPhase`, `EmptyUal`), as is a wallet rejection. After the receipt lands, `OracleRequestStatus` polls `getRatingByUal` every 5 s and warns after 90 s (`ORACLE_STALL_MS`) that the oracle has not fulfilled. The tables do not poll: `useSyncCatalogsWithRating` invalidates the `/rate-ka` list when that read turns pending, and both catalogs when it reaches `Phase1Completed`, so the row leaves the list and the landing catalog shows the score without a reload.

## Wallet

Reown AppKit + wagmi, Base Sepolia only (`networks = [baseSepolia]`, `expectedChainId = BASE_SEPOLIA_CHAIN_ID`).

`NEXT_PUBLIC_REOWN_PROJECT_ID` is **optional**: without it `wagmiAdapter` is `null`, `createAppKit` is skipped, and `AppKitProvider` renders children under a bare `QueryClientProvider` so the app still builds and renders — only wallet connect is unavailable. `metadata.url` in `src/lib/wagmi.ts` reads `NEXT_PUBLIC_APP_URL` and falls back to `http://localhost:3000`, so set that variable to the deployed origin — and add the same origin to Allowed Origins in Reown Cloud.

## Config

`next.config.ts`:

- Merges the **repo-root `.env`** into `process.env` at config load (existing values win). Do not create `apps/web/.env.local` as a second source of truth.
- `transpilePackages` for all five workspace packages.
- `serverExternalPackages` + webpack externals for AppKit/wagmi optional Node deps (`pino-pretty`, `lokijs`, `encoding`, `@coinbase/cdp-sdk`). Next 16 defaults to Turbopack; the webpack block is kept for `next build --webpack`.
- `experimental.serverActions.bodySizeLimit: "5mb"` to match the PDF cap.

Styling is Tailwind CSS v4 via `@tailwindcss/postcss`, with theme tokens in `src/app/globals.css`. Fonts are `next/font/google`: Inter (body), Space Grotesk (headings), JetBrains Mono (code).

`vercel.json` installs from the repo root and builds with `pnpm turbo run build --filter=web`. See the [Vercel notes in the root README](../../README.md#production-setup) for the project settings and the required production environment.

Production and Preview are **isolated environments**, not one deployment with two URLs: `NEXT_PUBLIC_RATING_CONTROLLER_ADDRESS`, `DKG_CONTEXT_GRAPH_ID` and `ALCHEMY_BASE_SEPOLIA_WH_SK` each hold a different value per environment, so a rating made on one is invisible to the other. Values and rationale are in the root README's [Vercel section](../../README.md#3--vercel).
