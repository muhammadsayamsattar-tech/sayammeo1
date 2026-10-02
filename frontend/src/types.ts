export type BuildKind = "web" | "mobile" | "api" | "cli" | "agent" | "site";

export type Audience = "coding" | "product" | "design";

export type Depth = "lean" | "standard" | "detailed";

export interface DraftInput {
  notes: string;
  kind: BuildKind;
  audience: Audience;
  depth: Depth;
  projectName?: string;
}

export interface PromptSection {
  id: string;
  heading: string;
  body: string;
}

export interface Readiness {
  id: string;
  label: string;
  present: boolean;
}

export interface StructuredPrompt {
  title: string;
  intro: string;
  markdown: string;
  sections: PromptSection[];
  readiness: Readiness[];
}

export interface Example extends DraftInput {
  id: string;
  label: string;
  hint: string;
}
