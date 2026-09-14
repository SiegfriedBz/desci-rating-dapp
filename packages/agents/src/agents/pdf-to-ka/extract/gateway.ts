import { createStructuredGeminiModel } from "../../../shared/llm/gemini.js";
import { publicationMetadataSchema } from "./schema.js";

export function createPublicationMetadataModel() {
  return createStructuredGeminiModel(
    publicationMetadataSchema,
    "publication_metadata"
  );
}
