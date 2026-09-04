import { z } from "zod";

/**
 * Gemini `response_schema` rejects a union `type` (e.g. `["string", "null"]`),
 * so absent values are modelled as optional (omitted) rather than nullable and
 * normalized back to `null` in `extract.ts`.
 */
export const publicationMetadataSchema = z.object({
  title: z.string(),
  abstract: z.string(),
  authors: z.array(
    z.object({
      name: z.string(),
      orcid: z.string().optional(),
    })
  ),
  doi: z.string().optional(),
  sections: z.array(
    z.object({
      heading: z.string(),
      text: z.string(),
      kind: z.enum(["methods", "materials", "results", "data_availability"]),
    })
  ),
  resources: z.array(
    z.object({
      kind: z.enum(["antibody", "cell_line", "software"]),
      name: z.string(),
      rrid: z.string().optional(),
    })
  ),
  dataRepositoryUrls: z.array(z.string()),
});

export type PublicationMetadataExtract = z.infer<
  typeof publicationMetadataSchema
>;
