export type TeiAuthor = {
  name: string;
  orcid: string | null;
};

export type TeiSectionKind =
  | "methods"
  | "materials"
  | "results"
  | "data_availability";

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
