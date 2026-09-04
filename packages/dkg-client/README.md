# `@desci/dkg-client`

TypeScript client for the local OriginTrail DKG daemon: publish Knowledge Assets, query SPARQL, and load assertion quads. Public API is `createDkgClient` from `src/index.ts` (package export `.`).

Package scripts: `pnpm --filter @desci/dkg-client build` (`tsc` → `dist/`) and `clean`.

Auth and API URL come from `createDkgClient({ apiUrl, authToken })` or env / `~/.dkg` (see `src/daemon/config.ts`): `DKG_AUTH_TOKEN` or `~/.dkg/auth.token`; `DKG_API_URL`; else `~/.dkg/api.port` or `config.json` `apiPort`; else `DKG_API_PORT` (default `9200`). `DKG_HOME` overrides the `~/.dkg` directory. Start the daemon with repo-root `pnpm dkg:start`.

`getChainId` / `getHubAddress` return the Base Sepolia constants from `@desci/shared`. `stop()` is a no-op; daemon lifecycle is `pnpm dkg:start` / `dkg stop`.

## Folders

### `src/`

Library entry (`index.ts`) re-exports `createDkgClient`, publication/rating KA helpers, schema types and vocab IRIs, and `TargetAssetNotIndexedError`.

`client.ts` wires `connectDaemon` to:

- `ensureContextGraph`, `publishAsset`, `getAssetUal`, `query`
- `publishPublication` / `publishRating`
- `getAssetQuadsByUal` (empty/404 → `TargetAssetNotIndexedError`)
- `queryRatingsAbout`

`errors.ts` defines `TargetAssetNotIndexedError` (`code: "TargetAssetNotIndexed"`).

### `src/schema/`

- `types.ts` — `PublicationMetadata`, publication/rating params and results, `PublishAssertionDeps`, `TargetAssetBinding`, `RatingBinding`
- `vocab.ts` — schema.org, RDF, and DEO predicate/class IRIs used when building and querying quads

### `src/helpers/`

Shared utilities (no daemon I/O):

- `nquads.ts` — string and xsd:integer N-Quad object literals
- `iris.ts` — `normalizeDoiIri`, `normalizeIpfsIri` (CID or `ipfs://CID` → `ipfs://…`), `normalizeOrcidIri`, `scicrunchResolverIri`
- `sparql.ts` — IRI wrapping / injection checks and SPARQL JSON term unwrapping
- `identity.ts` — `createPublicationIdentity` (`desci-pub-*` / `urn:uuid:pub-*`), `createRatingIdentity` (`desci-rating-*` / `urn:uuid:rating-*`)

### `src/publication-ka/`

Mint a publication Target KA: `buildPublicationGraph` (`graph.ts`) from `PublicationMetadata`, `publishPublicationKa` (`publish.ts`) via a `publishAssertion` dependency. When `PublicationMetadata.pdfCid` is set (caller pins via `@desci/agents/ipfs` before `runPdfToKaAgent`), quads include `schema:encoding` / `schema:contentUrl` as a content-addressed `ipfs://…` URI — this package does not call Pinata or IPFS gateways. `pdfIpfsUrlFromBindings` (`pdf-url.ts`) reads that URL back from assertion bindings.

### `src/rating-ka/`

Mint and read rating KAs (R-KA):

- `graph.ts` — `schema:about`, `schema:ratingValue`, `schema:author`, `schema:description`
- `publish.ts` — `publishRatingKa`
- `query.ts` — `queryRatingsAbout` (SPARQL “Action B”: ratings that `schema:about` a target UAL; `description` is optional for older R-KAs)

### `src/daemon/`

HTTP client for the running daemon (`connectDaemon` in `gateway.ts`). Waits on `GET /api/status` because `dkg start` can return before the API binds.

- `config.ts` — token and base URL resolution
- `http.ts` — Bearer `daemonRequest`
- `types.ts` — `DaemonClient`, `DaemonConnectConfig`

### `src/daemon/api/`

One module per daemon route used by this package:

- `context-graph.ts` — `POST /api/context-graph/create` (`ensureContextGraph`; ignores “already exists”)
- `assets.ts` — knowledge-asset GET/POST, UAL lookup, assertion-graph dump (`getAssetQuadsByUal`)
- `query.ts` — `POST /api/query`

### `scripts/`

Runnable from the repo root (they are not npm scripts on this package):

| Root script | File | What it does |
| --- | --- | --- |
| `pnpm dkg:publish-sample` | `publish-sample.ts` | `ensureContextGraph` then `publishAsset` with a sample `schema:name` / `schema:description` quad set |
| `pnpm dkg:publish-rating` | `publish-rating.ts` | `publishRating` with score `85` and author `BioProtocol_Phase1_Agent`; requires `DKG_UAL` and `DKG_CONTEXT_GRAPH_ID` |
| `pnpm dkg:fetch-asset` | `fetch-real-asset.ts` | Prints Action A (`getAssetQuadsByUal`) and Action B (`queryRatingsAbout`) |

`publish-sample` / `fetch-real-asset` share defaults in `scripts/cli/sample.ts` (`desci-sample` graph, KA name `desci-sample-10` unless `DKG_KA_NAME` / UAL is set). Env names used in these scripts: `DKG_CONTEXT_GRAPH_ID`, `DKG_KA_NAME`, `DKG_SUBJECT_URI`, `DKG_UAL`.

### `scripts/cli/`

Shared CLI helpers: `run.ts` (`runMain`), `env.ts` (`requireEnv`, `argOrEnv`), `sample.ts` (sample graph/KA name resolution).
