# `@desci/dkg-client`

TypeScript client for the local OriginTrail DKG daemon: publish Knowledge Assets, query SPARQL, and load assertion quads. Everything is exported from `src/index.ts` (single package export `.`) — `createDkgClient` is the main entry, alongside `probeDkgDaemon`, the KA graph builders, the query helpers, the schema types, and the vocab IRIs.

The daemon speaks HTTP only; this package does not import `@origintrail-official/dkg` (that dependency lives at the repo root for the `dkg` CLI). Route and graph-IRI shapes target **DKG V10**.

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
- `getChainId`, `getHubAddress`, `getApiBaseUrl`, `stop`

`errors.ts` defines `TargetAssetNotIndexedError` (`code: "TargetAssetNotIndexed"`) — the only exported error class. Everything else throws plain `Error`.

`daemon/probe.ts` exports `probeDkgDaemon(config?)`: a single `GET /api/status` with no ready-retry loop, returning `{ ok: true, apiUrl }` or `{ ok: false, reason }`. It never throws, including when the auth token is missing, so callers can use it to gate UI. `apps/web` calls it once per request to decide whether to render the catalog.

### `src/schema/`

- `types.ts` — `PublicationMetadata`, publication/rating params and results, `PublishAssertionDeps`, `TargetAssetBinding`, `RatingBinding` (+ `ratingBindingSchema`)
- `vocab.ts` — schema.org, RDF, and DEO predicate/class IRIs used when building and querying quads, plus the project's own `desci:` terms (`DESCI_OBSERVED_EVIDENCE`, `DESCI_MISSING_EVIDENCE`) for the rigor signals schema.org has no predicate for
- `ual.ts` — `parseUal` / `isUal`, the single strict definition of the `did:dkg:base:{chainId}/{agentAddress}/{tokenId}` grammar, and `ualFromVerifiableMemoryGraphIri` which recovers that UAL from a SPARQL `GRAPH` IRI

### `src/helpers/`

Shared utilities (no daemon I/O):

- `nquads.ts` — string and xsd:integer N-Quad object literals, plus `literalLexicalForm`, their inverse for reading query results (`"40"^^<xsd:integer>` → `40`, escapes undone)
- `iris.ts` — `normalizeDoiIri`, `normalizeIpfsIri` (CID or `ipfs://CID` → `ipfs://…`), `normalizeOrcidIri`, `scicrunchResolverIri`
- `sparql.ts` — IRI wrapping / injection checks, SPARQL JSON term unwrapping, and `sparqlTermOrNull` for reading one binding out of a row
- `identity.ts` — `createPublicationIdentity` (`desci-pub-*` / `urn:uuid:pub-*`), `createRatingIdentity` (`desci-rating-*` / `urn:uuid:rating-*`)

### `src/publication-ka/`

Mint a publication Target KA: `buildPublicationGraph` (`graph.ts`) from `PublicationMetadata`, `publishPublicationKa` (`publish.ts`) via a `publishAssertion` dependency. When `PublicationMetadata.pdfCid` is set (caller pins via `@desci/agents/ipfs` before `runPdfToKaAgent`), quads include `schema:encoding` / `schema:contentUrl` as a content-addressed `ipfs://…` URI — this package does not call Pinata or IPFS gateways. `pdfIpfsUrlFromBindings` (`pdf-url.ts`) reads that URL back from assertion bindings.

`query.ts` — `queryPublicationsWithRatings(query, contextGraphId)` powers the web catalog. It runs two SPARQL queries in parallel (`schema:ScholarlyArticle` publications, and `schema:about` + `schema:ratingValue` ratings), then joins them on the target UAL. Each UAL is derived from the verifiable-memory graph IRI by `ualFromVerifiableMemoryGraphIri` → `did:dkg:base:{chainId}/{agentAddress}/{tokenId}`. Bindings: `pub`, `subjectUri`, `title`, `rKaUal`, `ratingValue`.

### `src/rating-ka/`

Mint and read rating KAs (R-KA):

- `graph.ts` — `buildRatingGraph`. Four schema.org quads (`schema:about`, `schema:ratingValue`, `schema:author`, `schema:description`) plus one repeated `desci:observedEvidence` / `desci:missingEvidence` quad per evidence item. The schema.org four are the stable contract; `queryPublicationsWithRatings` keys the catalog off `schema:about` + `schema:ratingValue`.
- `publish.ts` — `publishRatingKa`
- `query.ts` — `queryRatingsAbout` (SPARQL “Action B”: ratings that `schema:about` a target UAL). Two queries joined in JS rather than one `SELECT` with two repeated-literal `OPTIONAL`s, which would return the cross product of the two evidence lists. The core query wraps its pattern in `GRAPH ?g` so each row carries `rKaUal` — the identity the contract records and the detail pages route on; the local `ratingSubject` cannot be routed on. Bindings: `ratingSubject`, `rKaUal`, `ratingValue`, `author`, `description`, `rationale`, `observed`, `missing`.
- `legacy-description.ts` — `parseLegacyEvidenceDescription`. R-KAs minted before the `desci:` terms existed flattened the verdict into one prose `schema:description`; `queryRatingsAbout` recovers evidence from it so no caller has to branch on format. Deliberately strict about the exact trailing `Observed:` / `Missing:` bullet structure, so a genuine rationale that merely opens a line with `Observed:` is left alone.

### `src/daemon/`

HTTP client for the running daemon (`connectDaemon` in `gateway.ts`). Waits on `GET /api/status` because `dkg start` can return before the API binds — 7 attempts with backoff (0/500/1000/2000/2000/3000/4000 ms), retrying only on “not reachable”.

- `config.ts` — token and base URL resolution
- `http.ts` — Bearer `daemonRequest`
- `probe.ts` — `probeDkgDaemon` (single-shot liveness, never throws)
- `types.ts` — `DaemonClient`, `DaemonConnectConfig`

### `src/daemon/api/`

One module per daemon route used by this package:

- `context-graph.ts` — `POST /api/context-graph/create` (`ensureContextGraph`; ignores “already exists”)
- `assets.ts` — UAL lookup (`GET /api/knowledge-assets/{name}`), create (`POST /api/knowledge-assets`), on-chain publish (`POST /api/knowledge-assets/{name}/vm/publish`), assertion-graph dump (`getAssetQuadsByUal`)
- `query.ts` — `POST /api/query`

`publishAssertion` is idempotent **by KA name**: it short-circuits to the existing UAL when the name already resolves, retries up to 4 times on transient access-policy errors, and recovers from “already exists” / “unfinished promote” responses by re-reading the UAL. Note that the default generated names (`desci-pub-*`, `desci-rating-*`) are fresh UUIDs, so idempotency only helps when the caller passes an explicit `name`.

### `scripts/`

Runnable from the repo root (they are not npm scripts on this package):

| Root script | File | What it does |
| --- | --- | --- |
| `pnpm dkg:publish-sample` | `publish-sample.ts` | `ensureContextGraph` then `publishAsset` with a sample `schema:name` / `schema:description` quad set |
| `pnpm dkg:fetch-asset` | `fetch-real-asset.ts` | Prints Action A (`getAssetQuadsByUal`) and Action B (`queryRatingsAbout`) |

`publish-sample` / `fetch-real-asset` share defaults in `scripts/cli/sample.ts`: the context graph comes from the required `DKG_CONTEXT_GRAPH_ID`, and the KA name falls back to `desci-sample-10` unless `DKG_KA_NAME` / `DKG_SUBJECT_URI` / `DKG_UAL` is set. Env names used in these scripts: `DKG_CONTEXT_GRAPH_ID`, `DKG_KA_NAME`, `DKG_SUBJECT_URI`, `DKG_UAL`.

### `scripts/cli/`

Shared CLI helpers: `run.ts` (`runMain`), `env.ts` (`argOrEnv`), `sample.ts` (sample KA name resolution).
