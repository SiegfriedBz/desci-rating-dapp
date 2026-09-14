import type { TeiSections } from "../grobid/types.js";

export const PUBLICATION_METADATA_SYSTEM_PROMPT = `You extract raw bibliographic and methods facts from scientific TEI text for a Knowledge Asset.
Rules:
- Copy strings that literally appear in the supplied text. Do not invent facts.
- Never score rigor, never output reported/not-reported flags, never judge quality.
- Preserve author byline order.
- DOI: prefer https://doi.org/10.... when a DOI is present; otherwise omit the field.
- ORCID: bare 0000-0002-... or full URL if present; otherwise omit the field.
- sections[].kind must be one of methods | materials | results | data_availability; keep the supplied [kind: ...] label unless the section prose clearly contradicts it.
- sections[].text must stay close to the supplied subsection prose (do not summarize away reagents/RRIDs).
- resources: only antibodies, cell lines, and software tools explicitly named; keep RRID:AB_/CVCL_/SCR_ verbatim when printed; omit rrid if absent.
- dataRepositoryUrls: only real http(s) repository URLs found in the text (GEO, Zenodo, GitHub, Figshare, etc.). Empty array if none.
- Use empty arrays when unknown. Never guess.`;

export function buildPublicationMetadataUserMessage(tei: TeiSections): string {
  const sectionBlock = tei.sections
    .map(
      (s, i) =>
        `### Section ${i + 1} [kind: ${s.kind}]: ${s.heading}\n${s.text}`
    )
    .join("\n\n");

  return `TEI header hints:
title: ${tei.title}
abstract: ${tei.abstract}
doi: ${tei.doi ?? "(none)"}
authors: ${JSON.stringify(tei.authors)}

Body sections:
${sectionBlock || "(no body sections)"}`;
}
