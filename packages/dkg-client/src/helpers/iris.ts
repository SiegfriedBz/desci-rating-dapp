/** Normalize a DOI string to https://doi.org/... or null. */
export function normalizeDoiIri(doi: string | null | undefined): string | null {
  if (!doi?.trim()) {
    return null;
  }
  const raw = doi.trim();
  const withoutScheme = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  const match = /^(10\.\d{4,9}\/\S+)$/i.exec(withoutScheme);
  if (!match?.[1]) {
    return null;
  }
  return `https://doi.org/${match[1]}`;
}

/** Normalize ORCID to https://orcid.org/0000-... or null. */
export function normalizeOrcidIri(
  orcid: string | null | undefined
): string | null {
  if (!orcid?.trim()) {
    return null;
  }
  const raw = orcid.trim().replace(/^https?:\/\/orcid\.org\//i, "");
  const match = /^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/i.exec(raw);
  if (!match?.[1]) {
    return null;
  }
  return `https://orcid.org/${match[1].toUpperCase()}`;
}

/** SciCrunch resolver IRI for an RRID, or null if malformed. */
export function scicrunchResolverIri(
  rrid: string | null | undefined
): string | null {
  if (!rrid?.trim()) {
    return null;
  }
  const raw = rrid.trim();
  const withoutPrefix = raw.replace(/^RRID:/i, "");
  if (!/^[A-Z]{2,}_[\w.-]+$/i.test(withoutPrefix)) {
    return null;
  }
  return `https://scicrunch.org/resolver/RRID:${withoutPrefix}`;
}

/**
 * Normalize a CID (or ipfs://CID) to an `ipfs://…` IRI, or null if empty.
 * Does not validate CIDv0/v1 encoding beyond a non-empty path segment.
 */
export function normalizeIpfsIri(
  cid: string | null | undefined
): string | null {
  if (!cid?.trim()) {
    return null;
  }
  const raw = cid.trim().replace(/^ipfs:\/\//i, "");
  if (!raw || raw.includes("/") || /\s/.test(raw)) {
    return null;
  }
  return `ipfs://${raw}`;
}
