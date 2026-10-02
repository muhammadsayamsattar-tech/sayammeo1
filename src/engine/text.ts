import type { BusinessFunction, TaskIntake, TaskScale } from "./types";

export function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function wordCount(value: string): number {
  const words = value.trim().match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g);
  return words ? words.length : 0;
}

export function bullets(value: string): string {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("- ") ? line : `- ${line.replace(/^[-•]\s*/, "")}`))
    .join("\n");
}

export function impliesFormat(text: string): boolean {
  return /\b(e-?mails?|memos?|lists?|checklists?|tables?|slides?|decks?|subject lines?|agendas?|sops?|one-?pagers?|scripts?|briefs?|reports?|messages?|bullets?|outlines?)\b/i.test(
    text,
  );
}

export function isCommunication(intake: Pick<TaskIntake, "function" | "request">): boolean {
  if (["sales", "marketing", "customer", "people", "legal"].includes(intake.function)) {
    return true;
  }
  return /\b(e-?mail|reply|message|announce|memo|letter|post|script|call|brief)\b/i.test(
    intake.request,
  );
}

const VAGUE_OPENING =
  /^(please\s+)?(can you\s+|could you\s+|i need you to\s+|i want you to\s+)?(help|assist|improve|optimise|optimize|look into|handle|work on|support|explore|deal with|think about|figure out|brainstorm)\b/i;

export function hasVagueOpening(request: string): boolean {
  return VAGUE_OPENING.test(clean(request));
}

export function voiceFor(fn: BusinessFunction): string {
  const voices: Record<BusinessFunction, string> = {
    general:
      "You are a business operator. Be specific, concise, and useful to the person who has to act.",
    sales:
      "You are a sales operator. Write so a buyer can decide, with a clear next step and no inflated claims.",
    marketing:
      "You are a marketing lead. Name the reader and the action you want. Every claim must be supportable from the sources given.",
    operations:
      "You are an operations lead. State the action, the owner, and how someone knows it is done.",
    finance:
      "You are a finance partner. Lead with the number, show the assumption under it, and separate fact from estimate.",
    people:
      "You are a people partner. Be respectful and concrete. Do not give legal advice; flag issues that need counsel or HR policy.",
    customer:
      "You are a customer operations lead. Be accountable, plain-spoken, and specific about what happens next.",
    product:
      "You are a product partner. Start from the user and the job to be done. Tie the work to an outcome and a constraint.",
    strategy:
      "You are a strategy partner. Frame the decision, give real options, and recommend one with the tradeoff visible.",
    legal:
      "You are a business drafter supporting counsel, not a lawyer. Use precise terms, flag risk, and do not invent legal conclusions.",
  };
  return voices[fn];
}

export function budgetFor(scale: TaskScale): number {
  if (scale === "small") return 220;
  if (scale === "medium") return 480;
  return 850;
}

export function titleFrom(request: string): string {
  const cleaned = clean(request);
  if (!cleaned) return "Untitled task";
  const sentence = cleaned.split(/(?<=[.?!])\s/)[0] ?? cleaned;
  if (sentence.length <= 88) return sentence.replace(/[.?!]$/, "");
  return `${sentence.slice(0, 85).replace(/\s+\S*$/, "")}…`;
}
