import { randomUUID } from "node:crypto";
import { geminiModel } from "@desci/env";
import type { KnowledgeAssetQuad } from "@desci/shared";
import {
  normalizeDoiIri,
  normalizeIpfsIri,
  normalizeOrcidIri,
  nquadIntegerLiteral,
  nquadStringLiteral,
  scicrunchResolverIri,
} from "../helpers/index.js";
import type {
  PublicationMetadata,
  PublicationSectionKind,
} from "../schema/types.js";
import {
  DEO_DATASET_DESCRIPTION,
  DEO_MATERIALS,
  DEO_METHODS,
  DEO_RESULTS,
  RDF_TYPE,
  SCHEMA_ADDITIONAL_TYPE,
  SCHEMA_AUTHOR,
  SCHEMA_CONTENT_URL,
  SCHEMA_CREATOR,
  SCHEMA_DATE_CREATED,
  SCHEMA_DESCRIPTION,
  SCHEMA_DISTRIBUTION,
  SCHEMA_ENCODING,
  SCHEMA_ENCODING_FORMAT,
  SCHEMA_HAS_PART,
  SCHEMA_IDENTIFIER,
  SCHEMA_MEDIA_OBJECT,
  SCHEMA_MENTIONS,
  SCHEMA_NAME,
  SCHEMA_PERSON,
  SCHEMA_POSITION,
  SCHEMA_SAME_AS,
  SCHEMA_SCHOLARLY_ARTICLE,
  SCHEMA_TEXT,
} from "../schema/vocab.js";

const SECTION_KIND_TO_DEO: Record<PublicationSectionKind, string> = {
  methods: DEO_METHODS,
  materials: DEO_MATERIALS,
  results: DEO_RESULTS,
  data_availability: DEO_DATASET_DESCRIPTION,
};

function defaultCreator(): string {
  return `grobid/grobid:0.8.2 + ${geminiModel}`;
}

/**
 * Build raw publication assertion graph (no scores / rigor flags) from extracted metadata.
 */
export function buildPublicationGraph(
  meta: PublicationMetadata,
  options?: {
    subjectUri?: string;
    creator?: string;
    dateCreated?: string;
  }
): { quads: KnowledgeAssetQuad[]; subjectUri: string } {
  const doiIri = normalizeDoiIri(meta.doi);
  const subjectUri =
    options?.subjectUri?.trim() ||
    doiIri ||
    `urn:uuid:pub-${randomUUID()}`;

  const quads: KnowledgeAssetQuad[] = [
    {
      subject: subjectUri,
      predicate: RDF_TYPE,
      object: SCHEMA_SCHOLARLY_ARTICLE,
    },
    {
      subject: subjectUri,
      predicate: SCHEMA_NAME,
      object: nquadStringLiteral(meta.title),
    },
    {
      subject: subjectUri,
      predicate: SCHEMA_DESCRIPTION,
      object: nquadStringLiteral(meta.abstract),
    },
    {
      subject: subjectUri,
      predicate: SCHEMA_CREATOR,
      object: nquadStringLiteral(options?.creator ?? defaultCreator()),
    },
    {
      subject: subjectUri,
      predicate: SCHEMA_DATE_CREATED,
      object: nquadStringLiteral(
        options?.dateCreated ?? new Date().toISOString()
      ),
    },
  ];

  if (doiIri) {
    quads.push({
      subject: subjectUri,
      predicate: SCHEMA_SAME_AS,
      object: doiIri,
    });
  }

  const pdfIri = normalizeIpfsIri(meta.pdfCid);
  if (pdfIri) {
    quads.push(
      {
        subject: subjectUri,
        predicate: SCHEMA_ENCODING,
        object: pdfIri,
      },
      {
        subject: pdfIri,
        predicate: RDF_TYPE,
        object: SCHEMA_MEDIA_OBJECT,
      },
      {
        subject: pdfIri,
        predicate: SCHEMA_ENCODING_FORMAT,
        object: nquadStringLiteral("application/pdf"),
      },
      {
        subject: pdfIri,
        predicate: SCHEMA_CONTENT_URL,
        object: pdfIri,
      }
    );
  }

  meta.authors.forEach((author, index) => {
    const orcidIri = normalizeOrcidIri(author.orcid);
    const personUri = orcidIri || `urn:uuid:author-${randomUUID()}`;
    quads.push(
      {
        subject: subjectUri,
        predicate: SCHEMA_AUTHOR,
        object: personUri,
      },
      {
        subject: personUri,
        predicate: RDF_TYPE,
        object: SCHEMA_PERSON,
      },
      {
        subject: personUri,
        predicate: SCHEMA_NAME,
        object: nquadStringLiteral(author.name),
      },
      {
        subject: personUri,
        predicate: SCHEMA_POSITION,
        object: nquadIntegerLiteral(index + 1),
      }
    );
  });

  for (const section of meta.sections) {
    const sectionUri = `urn:uuid:sec-${randomUUID()}`;
    quads.push(
      {
        subject: subjectUri,
        predicate: SCHEMA_HAS_PART,
        object: sectionUri,
      },
      {
        subject: sectionUri,
        predicate: RDF_TYPE,
        object: SECTION_KIND_TO_DEO[section.kind],
      },
      {
        subject: sectionUri,
        predicate: SCHEMA_NAME,
        object: nquadStringLiteral(section.heading),
      },
      {
        subject: sectionUri,
        predicate: SCHEMA_TEXT,
        object: nquadStringLiteral(section.text),
      }
    );
  }

  for (const resource of meta.resources) {
    const resourceUri = `urn:uuid:res-${randomUUID()}`;
    quads.push(
      {
        subject: subjectUri,
        predicate: SCHEMA_MENTIONS,
        object: resourceUri,
      },
      {
        subject: resourceUri,
        predicate: SCHEMA_NAME,
        object: nquadStringLiteral(resource.name),
      },
      {
        subject: resourceUri,
        predicate: SCHEMA_ADDITIONAL_TYPE,
        object: nquadStringLiteral(resource.kind),
      }
    );
    const identifier = scicrunchResolverIri(resource.rrid);
    if (identifier) {
      quads.push({
        subject: resourceUri,
        predicate: SCHEMA_IDENTIFIER,
        object: identifier,
      });
    }
  }

  for (const url of meta.dataRepositoryUrls) {
    const trimmed = url.trim();
    if (!trimmed) {
      continue;
    }
    quads.push({
      subject: subjectUri,
      predicate: SCHEMA_DISTRIBUTION,
      object: trimmed,
    });
  }

  return { quads, subjectUri };
}
