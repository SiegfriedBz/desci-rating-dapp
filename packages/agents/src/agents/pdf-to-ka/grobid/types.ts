import type { PublicationSectionKind } from "@desci/dkg-client";

export type TeiAuthor = {
  name: string;
  orcid: string | null;
};

/**
 * GROBID headings are classified straight into the publication KA vocabulary,
 * so this aliases the canonical union rather than restating it.
 */
export type TeiSectionKind = PublicationSectionKind;

export type TeiSection = {
  heading: string;
  text: string;
  kind: TeiSectionKind;
};

export type TeiSections = {
  title: string;
  abstract: string;
  doi: string | null;
  authors: TeiAuthor[];
  sections: TeiSection[];
};
