import { XMLParser } from "fast-xml-parser";
import { authorName, authorOrcid, extractDoi } from "./header-fields.js";
import {
  MAX_TOTAL_SECTION_CHARS,
  extractDivSections,
} from "./section-filter.js";
import type { TeiAuthor, TeiSections } from "./types.js";
import { asArray, collectText, normalizeWhitespace } from "./xml-utils.js";

/**
 * Parse GROBID TEI-XML into title/abstract/authors/DOI and kept body sections.
 */
export function extractTeiSections(teiXml: string): TeiSections {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    trimValues: true,
  });
  const parsed = parser.parse(teiXml) as Record<string, unknown>;
  const tei = (parsed["TEI"] ?? parsed["tei"]) as
    | Record<string, unknown>
    | undefined;
  if (!tei) {
    throw new Error("GROBID TEI-XML missing root <TEI> element");
  }

  const teiHeader = (tei["teiHeader"] ?? {}) as Record<string, unknown>;
  const fileDesc = (teiHeader["fileDesc"] ?? {}) as Record<string, unknown>;
  const titleStmt = (fileDesc["titleStmt"] ?? {}) as Record<string, unknown>;
  const profileDesc = (teiHeader["profileDesc"] ?? {}) as Record<
    string,
    unknown
  >;

  const title =
    normalizeWhitespace(collectText(titleStmt["title"])) || "Untitled";
  const abstract = normalizeWhitespace(collectText(profileDesc["abstract"]));
  const doi = extractDoi(teiHeader);

  const sourceDesc = (fileDesc["sourceDesc"] ?? {}) as Record<string, unknown>;
  const biblStruct = (sourceDesc["biblStruct"] ?? {}) as Record<
    string,
    unknown
  >;
  const analytic = (biblStruct["analytic"] ?? {}) as Record<string, unknown>;
  const authors: TeiAuthor[] = asArray(analytic["author"])
    .map((a) => {
      if (!a || typeof a !== "object") {
        return null;
      }
      const name = authorName(a as Record<string, unknown>);
      if (!name) {
        return null;
      }
      return {
        name,
        orcid: authorOrcid(a as Record<string, unknown>),
      };
    })
    .filter((a): a is TeiAuthor => a != null);

  const text = (tei["text"] ?? {}) as Record<string, unknown>;
  const body = text["body"];
  let sections = extractDivSections(body);

  let total = 0;
  sections = sections.filter((s) => {
    if (total >= MAX_TOTAL_SECTION_CHARS) {
      return false;
    }
    const room = MAX_TOTAL_SECTION_CHARS - total;
    if (s.text.length > room) {
      s.text = s.text.slice(0, room);
    }
    total += s.text.length;
    return s.text.length > 0;
  });

  return { title, abstract, doi, authors, sections };
}
