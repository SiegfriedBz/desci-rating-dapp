import { randomUUID } from "node:crypto";

export function createPublicationIdentity(name?: string): {
  name: string;
  fallbackSubjectUri: string;
} {
  const uuid = randomUUID();
  return {
    name: name?.trim() || `desci-pub-${uuid}`,
    fallbackSubjectUri: `urn:uuid:pub-${uuid}`,
  };
}

export function createRatingIdentity(name?: string): {
  ratingSubject: string;
  name: string;
} {
  const uuid = randomUUID();
  return {
    ratingSubject: `urn:uuid:rating-${uuid}`,
    name: name?.trim() || `desci-rating-${uuid}`,
  };
}
