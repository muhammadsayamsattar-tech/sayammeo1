export type TaskScale = "small" | "medium" | "large";

export type BusinessFunction =
  | "general"
  | "sales"
  | "marketing"
  | "operations"
  | "finance"
  | "people"
  | "customer"
  | "product"
  | "strategy"
  | "legal";

export interface TaskIntake {
  request: string;
  function: BusinessFunction;
  audience: string;
  outputHint: string;
  constraints: string;
  success: string;
  sources: string;
  deadline: string;
  owner: string;
  stakeholders: string;
  nonGoals: string;
}

export interface ScaleRecommendation {
  scale: TaskScale;
  confidence: "clear" | "likely" | "close";
  reasons: string[];
  runnerUp: TaskScale | null;
}

export interface ClarifyingQuestion {
  id: string;
  field: keyof TaskIntake;
  prompt: string;
  why: string;
  priority: "required" | "helpful";
}

export interface PromptSection {
  id: string;
  title: string;
  body: string;
}

export interface OmittedSection {
  title: string;
  reason: string;
}

export interface ComposedPrompt {
  scale: TaskScale;
  title: string;
  preamble: string;
  sections: PromptSection[];
  markdown: string;
  wordCount: number;
  budgetMax: number;
  efficiencyNotes: string[];
  omitted: OmittedSection[];
  assumptions: string[];
}

export interface Finding {
  level: "good" | "watch" | "gap";
  text: string;
}

export interface Review {
  status: "ready" | "tighten" | "incomplete";
  findings: Finding[];
}

export interface AgentResult {
  recommendation: ScaleRecommendation;
  scale: TaskScale;
  usedOverride: boolean;
  questions: ClarifyingQuestion[];
  prompt: ComposedPrompt;
  review: Review;
}

export const SCALE_ORDER: TaskScale[] = ["small", "medium", "large"];

export const FUNCTION_LABELS: Record<BusinessFunction, string> = {
  general: "General",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  finance: "Finance",
  people: "People",
  customer: "Customer",
  product: "Product",
  strategy: "Strategy",
  legal: "Legal support",
};

export const EMPTY_INTAKE: TaskIntake = {
  request: "",
  function: "general",
  audience: "",
  outputHint: "",
  constraints: "",
  success: "",
  sources: "",
  deadline: "",
  owner: "",
  stakeholders: "",
  nonGoals: "",
};
