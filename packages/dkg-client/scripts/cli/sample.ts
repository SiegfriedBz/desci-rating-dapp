/** Shared defaults for `dkg:publish-sample` / `dkg:fetch-asset` so they stay in sync. */

import { DEFAULT_DKG_CONTEXT_GRAPH_ID } from "@desci/env";

export const DEFAULT_SAMPLE_CONTEXT_GRAPH_ID = DEFAULT_DKG_CONTEXT_GRAPH_ID;
export const DEFAULT_SAMPLE_KA_NAME = "desci-sample-10";

export function sampleSubjectUri(kaName: string): string {
  return `urn:uuid:${kaName}`;
}

/** Resolve KA name: explicit env → subject `urn:uuid:<name>` → default (only if no UAL). */
export function resolveSampleKaName(options: {
  kaName?: string;
  subjectUri?: string;
  ual?: string;
}): string | undefined {
  const explicit = options.kaName?.trim();
  if (explicit) {
    return explicit;
  }

  const subject = options.subjectUri?.trim();
  if (subject) {
    const match = /^urn:uuid:(.+)$/i.exec(subject);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  // Zero-config sample workflow: no UAL/KA/subject → use the shared default.
  if (!options.ual?.trim()) {
    return DEFAULT_SAMPLE_KA_NAME;
  }

  return undefined;
}

export function resolveSampleContextGraphId(
  fromArgOrEnv?: string
): string {
  return fromArgOrEnv?.trim() || DEFAULT_SAMPLE_CONTEXT_GRAPH_ID;
}
