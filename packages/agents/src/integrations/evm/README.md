# integrations/evm

Viem helpers for Base Sepolia `RatingController` calls that the **oracle** signs. The user’s `requestPhase1` is wallet-signed in the web app — it does **not** live here.

## Public entrypoints

| Export | Role |
| --- | --- |
| `fulfillPhase1OnChain({ targetUal, score, rKaUal, chainId? })` | Submit `fulfillPhase1`; skips if already `Phase1Completed` |
| `PHASE_UNRATED` / `PHASE_PHASE1_COMPLETED` | Solidity `Phase` enum numeric values |
| `FulfillPhase1Result` | `{ status: "already_fulfilled" \| "fulfilled", txHash }` |

Used by `inngest/functions/phase1-requested.ts` after minting the R-KA.

## Layout

```
evm/
  fulfill-phase1.ts   # read getRatingByUal → write fulfillPhase1
  index.ts
  README.md
```

## Env

| Var | Role |
| --- | --- |
| `ORACLE_AGENT_PRIVATE_KEY` | required — signer must match on-chain `oracleAgent` |
| `BASE_SEPOLIA_RPC_URL` | required — public RPC for read + send |

Address/ABI come from `@desci/contracts` (`getRatingControllerAddress`, `ratingControllerAbi`). Chain defaults to Base Sepolia (`84532`).
