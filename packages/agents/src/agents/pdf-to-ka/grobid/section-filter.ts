import type { TeiSection, TeiSectionKind } from "./types.js";
import {
  asArray,
  collectText,
  normalizeWhitespace,
  truncate,
} from "./xml-utils.js";

export const MAX_SECTION_CHARS = 4_000;
export const MAX_TOTAL_SECTION_CHARS = 24_000;

/**
 * How a `<div>` heading relates to the region we want to keep.
 *
 * GROBID flattens body structure: a "Materials and Methods" heading often owns
 * no paragraphs of its own, while the prose lives in following sibling divs
 * whose own headings ("Skeletal preparations") name no category. Those divs
 * `inherit` the region opened by the last recognized heading; `exclude` closes
 * it so back matter never leaks in.
 */
type HeadingRole = TeiSectionKind | "exclude" | "inherit";

const EXCLUDED =
  /acknowledg|reference|bibliograph|funding|appendix|figure|table|supplement|competing|conflict|author\s+contribution|ethic|consent|abbreviation/i;

/** Narrative sections that are neither methods nor results: close the region. */
const NARRATIVE = /^(abstract|introduction|background|discussion|conclusions?|summary|related\s+work|limitations)\b/i;

const DATA_AVAILABILITY =
  /\bdata\s+availability\b|\bcode\s+availability\b|\bavailability\s+of\s+data\b|\bdata\s+and\s+code\b|\baccession\b/i;

function classifyHeading(heading: string, divType: string): HeadingRole {
  // divType is GROBID's own label when present and is more reliable than prose.
  const type = divType.toLowerCase();
  if (type && EXCLUDED.test(type)) {
    return "exclude";
  }
  if (DATA_AVAILABILITY.test(type)) {
    return "data_availability";
  }
  if (/result|finding/.test(type)) {
    return "results";
  }
  if (/method|experimental|procedure/.test(type)) {
    return "methods";
  }
  if (/material/.test(type)) {
    return "materials";
  }

  if (EXCLUDED.test(heading)) {
    return "exclude";
  }
  if (NARRATIVE.test(heading)) {
    return "exclude";
  }
  if (DATA_AVAILABILITY.test(heading)) {
    return "data_availability";
  }
  if (/\bresults?\b|\bfindings?\b/i.test(heading)) {
    return "results";
  }
  // "Materials and Methods" mentions both; methods is the more useful label.
  if (/\bmethods?\b|\bexperimental\b|\bprocedure\b/i.test(heading)) {
    return "methods";
  }
  if (/\bmaterials?\b/i.test(heading)) {
    return "materials";
  }
  return "inherit";
}

/**
 * Collect methods/materials/results/data-availability prose in document order,
 * carrying the region opened by the most recent recognized heading.
 */
export function extractDivSections(body: unknown): TeiSection[] {
  const sections: TeiSection[] = [];
  let region: TeiSectionKind | null = null;

  const walk = (node: unknown): void => {
    for (const div of asArray(
      node && typeof node === "object"
        ? (node as Record<string, unknown>)["div"]
        : undefined
    )) {
      if (!div || typeof div !== "object") {
        continue;
      }
      const rec = div as Record<string, unknown>;
      const heading = normalizeWhitespace(collectText(rec["head"])) || "Section";
      const divType = String(rec["@_type"] ?? "");
      const paragraphs = asArray(rec["p"])
        .map((p) => normalizeWhitespace(collectText(p)))
        .filter(Boolean);
      const text = truncate(paragraphs.join(" "), MAX_SECTION_CHARS);

      const role = classifyHeading(heading, divType);
      if (role === "exclude") {
        region = null;
      } else if (role !== "inherit") {
        region = role;
      }

      if (text && region) {
        sections.push({ heading, text, kind: region });
      }

      walk(rec);
    }
  };

  walk(body);
  return sections;
}
