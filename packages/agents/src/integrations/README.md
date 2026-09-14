# integrations

Adapters between `@desci/agents` and external systems. **Not agents** — agents live under `src/agents/`.

| Subfolder | Role | Import |
| --- | --- | --- |
| [`evm/`](evm/README.md) | On-chain `RatingController` writes (oracle wallet) | used by Inngest Phase-1 job; not a top-level package export |
| [`inngest/`](inngest/README.md) | Durable jobs + event client | `@desci/agents/inngest` |

```
Wallet requestPhase1
  → Alchemy webhook (apps/web)
  → processRatingControllerEvent → Inngest event
  → phase1RequestedFunction
      → ka-scorer agent
      → DKG publishRating
      → fulfillPhase1OnChain (evm/)

UI uploadAndPin
  → Inngest pdf.submitted
  → publishPdfFunction
      → fetchPdfByCid (ipfs/)
      → runPdfToKaAgent
```

Served from the Next app at `apps/web/src/app/api/inngest/route.ts` (`pnpm inngest:dev` at repo root).
