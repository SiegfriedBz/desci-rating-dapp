export type LegacyEvidenceDescription = {
  /** The description with the trailing evidence sections removed. */
  rationale: string;
  observed: string[];
  missing: string[];
};

/**
 * Recover evidence from R-KAs minted before `desci:observedEvidence` existed.
 *
 * Those assertions flattened the scorer's verdict into one `schema:description`
 * literal shaped exactly like this:
 *
 * ```
 * <rationale>
 *
 * Observed:
 * - item
 *
 * Missing:
 * - item
 * ```
 *
 * Deliberately strict: the whole structure must be present and trailing, with
 * blank-line separators and every item a `- ` bullet. A genuine rationale that
 * merely opens a line with `Observed:` is left alone rather than mangled.
 *
 * Returns null when the description is not in this legacy shape.
 */
export function parseLegacyEvidenceDescription(
  description: string
): LegacyEvidenceDescription | null {
  const lines = description.replace(/\r\n?/g, "\n").split("\n");

  // Trailing blank lines are noise; the `Missing:` list must end the text.
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") {
    lines.pop();
  }

  const missingHeader = lines.lastIndexOf("Missing:");
  if (missingHeader < 0) {
    return null;
  }
  const observedHeader = lines.lastIndexOf("Observed:", missingHeader - 1);
  if (observedHeader < 1) {
    return null;
  }

  // Both headers are preceded by exactly one blank separator line.
  if (
    lines[observedHeader - 1] !== "" ||
    lines[missingHeader - 1] !== "" ||
    missingHeader - observedHeader < 3
  ) {
    return null;
  }

  const observed = bulletItems(lines.slice(observedHeader + 1, missingHeader - 1));
  const missing = bulletItems(lines.slice(missingHeader + 1));
  if (!observed || !missing) {
    return null;
  }

  return {
    rationale: lines.slice(0, observedHeader - 1).join("\n").trim(),
    observed: observed.filter((item) => item !== "(none)"),
    missing: missing.filter((item) => item !== "(none)"),
  };
}

/**
 * Every line must be a non-empty `- ` bullet, and there must be at least one.
 * Null signals "not the legacy shape" so the caller can bail out whole.
 */
function bulletItems(lines: string[]): string[] | null {
  if (lines.length === 0) {
    return null;
  }
  const items: string[] = [];
  for (const line of lines) {
    if (!line.startsWith("- ")) {
      return null;
    }
    const item = line.slice(2).trim();
    if (!item) {
      return null;
    }
    items.push(item);
  }
  return items;
}
