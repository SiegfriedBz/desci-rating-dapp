import type { PublicationMetadata } from "@desci/dkg-client";
import type { TeiSections } from "../grobid/types.js";
import { createPublicationMetadataModel } from "./gateway.js";
import { isHttpUrl } from "./helpers.js";
import {
  PUBLICATION_METADATA_SYSTEM_PROMPT,
  buildPublicationMetadataUserMessage,
} from "./prompts.js";
import { publicationMetadataSchema } from "./schema.js";

/**
 * Extract structured PublicationMetadata from TEI slices.
 * Extraction only — no scores, flags, or rigor judgments.
 */
export async function extractPublicationMetadata(
  tei: TeiSections
): Promise<PublicationMetadata> {
  const model = createPublicationMetadataModel();
  const result = await model.invoke([
    {
      role: "system",
      content: PUBLICATION_METADATA_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildPublicationMetadataUserMessage(tei),
    },
  ]);

  const parsed = publicationMetadataSchema.parse(result);

  // Prefer GROBID-derived bibliographic fields when Gemini leaves them empty.
  const title = parsed.title.trim() || tei.title;
  const abstract = parsed.abstract.trim() || tei.abstract;
  const doi =
    parsed.doi?.trim() || (tei.doi ? `https://doi.org/${tei.doi}` : null);
  const authors =
    parsed.authors.length > 0
      ? parsed.authors.map((a) => ({ name: a.name, orcid: a.orcid ?? null }))
      : tei.authors.map((a) => ({ name: a.name, orcid: a.orcid }));

  const sections =
    parsed.sections.length > 0
      ? parsed.sections
      : tei.sections.map((s) => ({
          heading: s.heading,
          text: s.text,
          kind: s.kind,
        }));

  return {
    title,
    abstract,
    authors,
    doi,
    sections,
    resources: parsed.resources.map((r) => ({ ...r, rrid: r.rrid ?? null })),
    dataRepositoryUrls: parsed.dataRepositoryUrls.filter(isHttpUrl),
    pdfCid: null,
  };
}
