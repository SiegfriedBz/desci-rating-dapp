import {
  asArray,
  collectText,
  normalizeWhitespace,
} from "./xml-utils.js";

export function authorName(author: Record<string, unknown>): string {
  const persName = author["persName"];
  if (persName && typeof persName === "object") {
    const p = persName as Record<string, unknown>;
    const forename = asArray(p["forename"])
      .map((f) => normalizeWhitespace(collectText(f)))
      .filter(Boolean)
      .join(" ");
    const surname = normalizeWhitespace(collectText(p["surname"]));
    const combined = [forename, surname].filter(Boolean).join(" ");
    if (combined) {
      return combined;
    }
  }
  return normalizeWhitespace(collectText(author["persName"] || author));
}

export function authorOrcid(author: Record<string, unknown>): string | null {
  for (const idno of asArray(author["idno"])) {
    if (typeof idno === "string") {
      const m = /orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i.exec(idno);
      if (m?.[1]) {
        return m[1];
      }
      continue;
    }
    if (idno && typeof idno === "object") {
      const rec = idno as Record<string, unknown>;
      const type = String(rec["@_type"] ?? "").toLowerCase();
      const value = normalizeWhitespace(collectText(rec));
      if (type.includes("orcid") || /orcid/i.test(value)) {
        const m = /(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i.exec(value);
        if (m?.[1]) {
          return m[1];
        }
      }
    }
  }
  return null;
}

export function extractDoi(teiHeader: Record<string, unknown>): string | null {
  const fileDesc = teiHeader["fileDesc"] as Record<string, unknown> | undefined;
  const sourceDesc = fileDesc?.["sourceDesc"] as
    | Record<string, unknown>
    | undefined;
  const biblStruct = sourceDesc?.["biblStruct"] as
    | Record<string, unknown>
    | undefined;
  const idnos = [
    ...asArray(biblStruct?.["idno"]),
    ...asArray(
      fileDesc?.["publicationStmt"] &&
        (fileDesc["publicationStmt"] as Record<string, unknown>)["idno"]
    ),
  ];

  for (const idno of idnos) {
    if (typeof idno === "string") {
      const m = /(10\.\d{4,9}\/\S+)/i.exec(idno);
      if (m?.[1]) {
        return m[1].replace(/[.,;]+$/, "");
      }
      continue;
    }
    if (idno && typeof idno === "object") {
      const rec = idno as Record<string, unknown>;
      const type = String(rec["@_type"] ?? "").toLowerCase();
      const value = normalizeWhitespace(collectText(rec));
      if (type === "doi" || /^10\.\d{4,9}\//.test(value)) {
        const m = /(10\.\d{4,9}\/\S+)/i.exec(value);
        if (m?.[1]) {
          return m[1].replace(/[.,;]+$/, "");
        }
      }
    }
  }
  return null;
}
