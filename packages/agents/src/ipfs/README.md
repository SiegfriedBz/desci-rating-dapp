# ipfs

Shared Pinata pin + HTTP-gateway fetch for PDF bytes. **Not an agent** — used by the publish CLI, and later by UI viewers / Inngest workers.

Import via `@desci/agents/ipfs` (not re-exported from `@desci/agents` or `@desci/agents/pdf-to-ka`).

## Public entrypoints

| Export | Role |
|--------|------|
| `pinPdfToIpfs(pdf, filename?)` | Pinata `pinFileToIPFS` → `{ cid, ipfsUri }` |
| `fetchPdfByCid(cid)` | `GET {IPFS_GATEWAY_URL}/{cid}` → `Uint8Array` |
| `ipfsUriForCid(cid)` | CID → `ipfs://…` (throws if empty/invalid) |
| `bareCid(cid)` | Strip `ipfs://` / validate path segment |
| `PinPdfResult` | `{ cid, ipfsUri }` |

`ipfsUriForCid` uses `normalizeIpfsIri` from `@desci/dkg-client` so URI shaping is not duplicated.

## Layout

```
ipfs/
  pinata.ts   # pinPdfToIpfs (bytes + filename)
  fetch.ts    # fetchPdfByCid
  uri.ts      # ipfsUriForCid, bareCid
  index.ts
  README.md
```

## How it fits pdf-to-ka

```
Caller has PDF bytes
  → pinPdfToIpfs(bytes)          # this module
  → runPdfToKaAgent({ pdf, pdfCid, … })

Caller has only a CID (UI / Inngest)
  → fetchPdfByCid(cid)           # this module
  → runPdfToKaAgent({ pdf, pdfCid, … })
```

The CLI (`scripts/publish-pdf.ts`) pins then calls the agent; it does **not** fetch after pin.

## Env

| Var | Role |
| --- | --- |
| `PINATA_JWT` | required for `pinPdfToIpfs` |
| `IPFS_GATEWAY_URL` | optional; resolved via `ipfsGatewayUrl` in `@desci/env` (default Pinata public gateway) |

Pinning and retrieval are separate: Pinata JWT for `pinPdfToIpfs`, `ipfsGatewayUrl` for `fetchPdfByCid`. Do not use `ipfs.io` (rate limits / SW-only).
