import type {
  Audience,
  BuildKind,
  Depth,
  DraftInput,
  PromptSection,
  Readiness,
  StructuredPrompt,
} from "./types";

/**
 * On-device drafter. A model can replace this function later as long as it
 * returns the same StructuredPrompt shape.
 */

const GROUP_NOUN =
  /\b(neighbors?|freelancers?|illustrators?|students?|founders?|designers?|developers?|teachers?|parents?|families|teams?|customers?|users?|writers?|photographers?|contractors?|roommates?)\b/i;

const TONE_WORDS = ["simple", "calm", "playful", "premium", "minimal", "friendly", "quiet", "bold", "warm", "pretty"];

const TECH: [RegExp, string][] = [
  [/\bnext\.?js\b/i, "Next.js"],
  [/\breact native\b/i, "React Native"],
  [/\breact\b/i, "React"],
  [/\bvue\b/i, "Vue"],
  [/\bsvelte\b/i, "Svelte"],
  [/\btypescript\b/i, "TypeScript"],
  [/\bpython\b/i, "Python"],
  [/\bfastapi\b/i, "FastAPI"],
  [/\bdjango\b/i, "Django"],
  [/\bpostgres(?:ql)?\b/i, "PostgreSQL"],
  [/\bsqlite\b/i, "SQLite"],
  [/\bsupabase\b/i, "Supabase"],
  [/\bfirebase\b/i, "Firebase"],
  [/\btailwind\b/i, "Tailwind"],
  [/\bflutter\b/i, "Flutter"],
  [/\bswift\b/i, "Swift"],
  [/\bkotlin\b/i, "Kotlin"],
  [/\brust\b/i, "Rust"],
  [/\bobsidian\b/i, "Obsidian"],
];

const MODEL_NOUNS: [RegExp, string][] = [
  [/\btools?\b/i, "Tools"],
  [/\binvoices?\b/i, "Invoices"],
  [/\bpayments?\b/i, "Payments"],
  [/\breminders?\b/i, "Reminders"],
  [/\bnotes?\b/i, "Notes"],
  [/\bmaps?\b/i, "Maps"],
  [/\brequests?\b/i, "Requests"],
  [/\bbookings?\b/i, "Bookings"],
  [/\bmessages?\b/i, "Messages"],
  [/\bfiles?\b/i, "Files"],
  [/\bfolders?\b/i, "Folders"],
  [/\baccounts?\b/i, "Accounts"],
  [/\btasks?\b/i, "Tasks"],
  [/\bprojects?\b/i, "Projects"],
  [/\borders?\b/i, "Orders"],
  [/\bevents?\b/i, "Events"],
];

const KIND_LABEL: Record<BuildKind, string> = {
  web: "a responsive web app",
  mobile: "a phone-first app",
  api: "an HTTP API",
  cli: "a command-line tool",
  agent: "an AI agent",
  site: "a small website",
};

const APPROACH: Record<BuildKind, string> = {
  web: "Ship one responsive web app with a single path from an empty state to the core action.",
  mobile: "Design every primary action for a phone, with thumb-reachable controls and a slow-network state.",
  api: "Specify resources, verbs, and error shapes first. Include one happy-path request and response.",
  cli: "Offer one clear command, readable flags, and errors that say what to fix. Include a dry run if the command writes or deletes.",
  agent: "Define the agent's role, the inputs it receives, the output shape, and what it must not invent.",
  site: "Give each page one job. Write the content before decorating it.",
};

const FALLBACK_TITLE: Record<BuildKind, string> = {
  web: "Web app",
  mobile: "Mobile app",
  api: "API",
  cli: "Command-line tool",
  agent: "AI agent",
  site: "Website",
};

function clean(raw: string): string {
  return raw
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function decapitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function stripEnd(value: string): string {
  return value.replace(/[.!?;,\s]+$/g, "").trim();
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function explodeComma(line: string): string[] {
  if (!line.includes(",")) return [line];
  const parts = line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return [line];
  const usable = parts.filter(
    (part) => part.split(/\s+/).length >= 3 || /^(no|don't|do not|avoid|without)\b/i.test(part),
  );
  return usable.length >= 2 ? usable : [line];
}

function explodeAnd(line: string): string[] {
  if (!/ and /i.test(line)) return [line];
  const parts = line.split(/\s+and\s+/i).map((part) => part.trim());
  if (parts.length === 2 && parts.every((part) => part.split(/\s+/).length >= 4)) return parts;
  return [line];
}

function splitFragments(notes: string): string[] {
  const fragments: string[] = [];
  for (const line of notes.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = /^([-*•]|\d+[.)])\s+/.test(trimmed);
    const base = clean(trimmed);
    if (!base) continue;
    const pieces = bullet || base.length < 80 ? [base] : base.split(/(?<=[.!?;])\s+/);
    for (const piece of pieces) {
      const cleaned = clean(piece);
      if (!cleaned) continue;
      for (const clause of explodeComma(cleaned).flatMap(explodeAnd)) {
        const next = clean(clause);
        if (next) fragments.push(next);
      }
    }
  }
  return dedupe(fragments);
}

function goalScore(fragment: string): number {
  const text = fragment.toLowerCase();
  let score = 0;
  if (/\b(build|create|making|make|design|ship|app|tool|platform|site|service|library|cli|agent|product)\b/.test(text)) {
    score += 2;
  }
  if (/\b(want|need|idea|project)\b/.test(text)) score += 1;
  if (/\b(a|an|the)\b/.test(text)) score += 1;
  if (fragment.length > 40) score += 1;
  if (text.endsWith("?")) score -= 3;
  if (/\b(don't|do not|avoid|hate|without)\b/.test(text)) score -= 3;
  if (/^(keep|maybe|perhaps)\b/.test(text)) score -= 2;
  return score;
}

function titleCase(input: string): string {
  const small = new Set(["a", "an", "the", "of", "for", "and", "or", "to", "in", "on", "with", "from"]);
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (word.length <= 5 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function extractTitle(goal: string, projectName: string, kind: BuildKind): string {
  const named = projectName.trim();
  if (named) return named;
  const leadingArticle = goal.match(
    /^(?:a|an|the)\s+([^.,;:?]{2,80}?)(?=\s+(?:where|that|which|so)\b|[.,;:?]|$)/i,
  );
  if (leadingArticle) {
    const phrase = leadingArticle[1].trim().split(/\s+/).slice(0, 7).join(" ");
    return titleCase(phrase);
  }
  let words = stripEnd(goal).split(/\s+/);
  const stop = words.findIndex((word) => /^(that|where|which)$/i.test(word));
  if (stop > 2) words = words.slice(0, stop);
  else words = words.slice(0, 6);
  while (words.length > 1 && /^(a|an|the|of|for|and|to|with|from)$/i.test(words[words.length - 1] ?? "")) {
    words = words.slice(0, -1);
  }
  if (words.join(" ").length > 3) return titleCase(words.join(" "));
  return FALLBACK_TITLE[kind];
}

function isToneOnly(fragment: string): boolean {
  return /^(?:keep it |make it |i want it )?(?:simple|calm|playful|minimal|pretty|quiet|warm|bold|friendly|premium)(?: and [a-z]+)?[.!]?$/i.test(
    fragment.trim(),
  );
}

function isTechAside(fragment: string): boolean {
  return /^(?:i\s+)?use\s+\S+/i.test(fragment.trim());
}

type FragmentKind = "question" | "exclusion" | "constraint" | "success" | "feature";

function classify(fragment: string): FragmentKind {
  const text = fragment.toLowerCase();
  if (text.endsWith("?")) return "question";
  if (
    /\b(don't|do not|dont|avoid|without|never|shouldn't|should not|hate|isn't a|is not a|no need for)\b/.test(text) ||
    /\bno\s+(?:password|login|database|backend|spreadsheet|accounting)/.test(text)
  ) {
    return "exclusion";
  }
  if (
    /\b(must|required|has to|have to|only|at most|no more than|offline|accessible|wcag|gdpr|hipaa|on phones?|phone first|mobile first|work on (?:a )?phone)\b/.test(
      text,
    )
  ) {
    return "constraint";
  }
  if (/\b(so that|success|done when|works when|metric|kpi)\b/.test(text)) return "success";
  return "feature";
}

function asRequirement(fragment: string): string {
  const consider = /^(maybe|perhaps|possibly)\b/i.test(fragment.trim());
  let text = stripEnd(fragment);
  text = text.replace(/^(?:and|also|then)\s+/i, "");
  text = text.replace(/^(?:i\s+)?(?:want|need|would like|i'd like|id like)\s+to\s+/i, "");
  text = text.replace(/^i\s+(?:want|need)\s+/i, "");
  text = text.replace(/^(?:it|this)\s+should\s+/i, "");
  text = text.replace(/^(?:maybe|perhaps|possibly)\s+/i, "");
  text = capitalize(text);
  return consider ? `Consider: ${decapitalize(text)}` : text;
}

function asExclusion(fragment: string): string {
  let text = stripEnd(fragment).replace(/^and\s+/i, "");
  const hate = text.match(/\bhate\s+(.+)$/i);
  if (hate) return `Should not feel like ${decapitalize(stripEnd(hate[1]))}`;
  text = text.replace(/^(?:i\s+)?(?:don't|do not|dont)\s+want\s+/i, "");
  text = text.replace(/^(?:please\s+)?avoid\s+/i, "");
  text = text.replace(/^no\s+/i, "");
  text = text.replace(/^(?:a|an|the)\s+/i, "");
  text = text.replace(/\s+if i can avoid it$/i, "");
  text = stripEnd(text);
  if (!text) return "Leave this out of the first version";
  return `Leave out: ${decapitalize(text)}`;
}

function audienceFrom(fragments: string[], goal: string): string | null {
  for (const fragment of [goal, ...fragments]) {
    const match = fragment.match(/\bfor\s+((?:freelance\s+|small\s+)?[a-z]+(?:\s+[a-z]+){0,3})/i);
    if (!match) continue;
    const phrase = match[1].trim();
    if (/^(the|a|an|example|instance|now|later|me|myself|free|fun|weekend)\b/i.test(phrase)) continue;
    if (GROUP_NOUN.test(phrase) || /\b(people|studios)\b/i.test(phrase)) return phrase;
  }
  const groups = new Set<string>();
  for (const fragment of [goal, ...fragments]) {
    for (const match of fragment.match(new RegExp(GROUP_NOUN.source, "gi")) ?? []) {
      const word = match.toLowerCase();
      if (word === "people") continue;
      groups.add(word);
    }
  }
  const list = [...groups].slice(0, 3);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0] ?? null;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function toneWords(fragments: string[]): string[] {
  const blob = fragments.join(" ").toLowerCase();
  return TONE_WORDS.filter((word) => new RegExp(`\\b${word}\\b`).test(blob));
}

function detectTech(notes: string): string[] {
  return dedupe(TECH.filter(([pattern]) => pattern.test(notes)).map(([, label]) => label));
}

function modelNouns(notes: string): string[] {
  return MODEL_NOUNS.filter(([pattern]) => pattern.test(notes)).map(([, label]) => label);
}

function limits(depth: Depth): { reqs: number; criteria: number; questions: number } {
  if (depth === "lean") return { reqs: 5, criteria: 3, questions: 3 };
  if (depth === "detailed") return { reqs: 12, criteria: 6, questions: 6 };
  return { reqs: 8, criteria: 4, questions: 4 };
}

function criterion(requirement: string): string {
  let text = stripEnd(requirement);
  if (/^(people|neighbors|users|they|a person|someone)\b/i.test(text)) return capitalize(text);
  text = text.replace(/^(?:need|want)\s+to\s+/i, "");
  text = text.replace(/^(?:need|want)\s+/i, "");
  if (/^(?:send|track|remind|request|list|browse|search|create|share|book|pay|rebuild|watch|see|view|sign)\b/i.test(text)) {
    return `A person can ${decapitalize(text)}`;
  }
  return capitalize(text);
}

function openQuestions(args: {
  source: string[];
  audienceKnown: boolean;
  hasBounds: boolean;
  hasRequirements: boolean;
  tech: string[];
  notes: string;
  audience: Audience;
  depth: Depth;
}): string[] {
  const source = args.source.map((question) => {
    const trimmed = question.trim();
    return trimmed.endsWith("?") ? trimmed : `${stripEnd(trimmed)}?`;
  });
  const extra: string[] = [];
  if (!args.hasRequirements) extra.push("What should a person be able to do in the first version?");
  if (!args.audienceKnown) extra.push("Who is the primary person using this on day one?");
  if (args.audience === "coding" && args.tech.length === 0 && args.depth !== "lean") {
    extra.push("Is there a required stack, host, or deadline?");
  }
  if (/\bmap\b/i.test(args.notes) && !/\b(radius|miles|kilometers|within\s+\d+)/i.test(args.notes)) {
    extra.push("How should nearby be decided?");
  }
  if (/\b(pay|payment|invoice|checkout)\b/i.test(args.notes) && !/\b(stripe|paypal|square)\b/i.test(args.notes)) {
    extra.push("How does payment actually happen, and what does a failed payment look like?");
  }
  if (/\b(sign[- ]?in|logins?|log in|auth|magic links?|accounts?)\b/i.test(args.notes)) {
    extra.push("What can someone do before they sign in?");
  }
  if (args.depth === "detailed" && !args.hasBounds) {
    extra.push("What is explicitly out of the first version?");
  }
  return dedupe([...source, ...extra]);
}

function introFor(audience: Audience, kind: BuildKind, title: string): string {
  const shape = KIND_LABEL[kind];
  if (audience === "product") {
    return `Write a product brief for ${title}. Stay concrete, keep specific wording from the notes, and do not invent a market or a business model. The first version is ${shape}.`;
  }
  if (audience === "design") {
    return `Prepare a design brief for ${title}. Describe the people, the flows, the hierarchy, and the tone. Do not specify an implementation. The product is ${shape}.`;
  }
  return `You are a senior engineer building ${title}. Treat the requirements as the scope. Do not add features that are not listed. If an open question blocks a decision, pick the smallest workable option and write the assumption down. Build ${shape}.`;
}

function bullets(items: string[], limit: number): string {
  return items
    .slice(0, limit)
    .map((item) => `- ${item}`)
    .join("\n");
}

function section(id: string, heading: string, body: string): PromptSection | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  return { id, heading, body: trimmed };
}

function renderMarkdown(title: string, intro: string, sections: PromptSection[], audience: Audience): string {
  const label = audience === "product" ? "Product brief" : audience === "design" ? "Design brief" : "Build prompt";
  const parts = [`# ${label}: ${title}`, "", intro, ""];
  for (const item of sections) {
    parts.push(`## ${item.heading}`, "", item.body, "");
  }
  return `${parts.join("\n").trim()}\n`;
}

export function structurePrompt(input: DraftInput): StructuredPrompt {
  const notes = input.notes.trim();
  const fragments = splitFragments(notes);
  const goalFragment =
    fragments.reduce<{ text: string; score: number } | null>((best, fragment) => {
      const score = goalScore(fragment);
      if (!best || score > best.score) return { text: fragment, score };
      return best;
    }, null)?.text ?? notes;
  const goal = capitalize(stripEnd(goalFragment));
  const title = extractTitle(goal, input.projectName ?? "", input.kind);
  const features: string[] = [];
  const constraints: string[] = [];
  const exclusions: string[] = [];
  const successes: string[] = [];
  const questions: string[] = [];

  for (const fragment of fragments) {
    if (fragment === goalFragment || isToneOnly(fragment) || isTechAside(fragment)) continue;
    const kind = classify(fragment);
    if (kind === "question") questions.push(fragment);
    else if (kind === "exclusion") exclusions.push(asExclusion(fragment));
    else if (kind === "constraint") constraints.push(capitalize(stripEnd(fragment)));
    else if (kind === "success") successes.push(capitalize(stripEnd(fragment)));
    else features.push(asRequirement(fragment));
  }

  const tech = detectTech(notes);
  const tones = toneWords(fragments);
  if (tones.length) constraints.push(`Tone already described: ${tones.join(", ")}.`);
  if (tech.length) constraints.push(`Named in the notes: ${tech.join(", ")}.`);

  const who = audienceFrom(
    fragments.filter((fragment) => fragment !== goalFragment),
    goal,
  );
  const cap = limits(input.depth);
  const requirementLines = dedupe(features).slice(0, cap.reqs);
  const constraintLines = dedupe(constraints);
  const exclusionLines = dedupe(exclusions);
  const criteria = dedupe([
    ...successes.map(criterion),
    ...requirementLines.filter((item) => !/^Consider:/i.test(item)).map(criterion),
  ]).slice(0, cap.criteria);
  const gaps = openQuestions({
    source: questions,
    audienceKnown: Boolean(who),
    hasBounds: constraintLines.length + exclusionLines.length > 0,
    hasRequirements: requirementLines.length > 0,
    tech,
    notes,
    audience: input.audience,
    depth: input.depth,
  }).slice(0, cap.questions);

  const intro = introFor(input.audience, input.kind, title);
  const sections: PromptSection[] = [];
  const push = (item: PromptSection | null) => {
    if (item) sections.push(item);
  };
  const audienceLine = who ? `Primary audience: ${who}.` : "";

  if (input.audience === "design") {
    push(section("goal", "Goal", goal));
    push(section("who", "Audience", audienceLine));
    push(section("jobs", "Jobs to be done", bullets(requirementLines, cap.reqs)));
    const toneBits = [
      tones.length ? `Tone words already in the notes: ${tones.join(", ")}.` : "",
      exclusionLines.find((item) => /feel like/i.test(item)) ?? "",
    ].filter(Boolean);
    push(section("tone", "Tone", toneBits.join("\n\n")));
    push(section("constraints", "Constraints", bullets(constraintLines.filter((item) => !item.startsWith("Tone already")), 8)));
    push(section("scope", "Out of scope", bullets(exclusionLines, 8)));
    push(section("done", "Done when", bullets(criteria, cap.criteria)));
  } else if (input.audience === "product") {
    push(section("problem", "Problem", goal));
    push(section("who", "Who it's for", audienceLine));
    push(section("version", "First version", `Build ${KIND_LABEL[input.kind]}. Include only what is listed below.`));
    push(section("requirements", "Requirements", bullets(requirementLines, cap.reqs)));
    push(section("constraints", "Constraints", bullets(constraintLines, 8)));
    push(section("scope", "Non-goals", bullets(exclusionLines, 8)));
    push(section("done", "How we'll know it worked", bullets(criteria, cap.criteria)));
  } else {
    push(section("goal", "Goal", goal));
    push(section("who", "Who it's for", audienceLine));
    push(section("shape", "What to build", `${capitalize(KIND_LABEL[input.kind])}.`));
    push(section("requirements", "Requirements", bullets(requirementLines, cap.reqs)));
    push(section("constraints", "Constraints", bullets(constraintLines, 8)));
    push(section("scope", "Out of scope", bullets(exclusionLines, 8)));
    push(section("done", "Acceptance criteria", bullets(criteria, cap.criteria)));
  }

  if (input.depth === "detailed") {
    push(section("approach", "Suggested approach", `Suggestion, not a requirement: ${APPROACH[input.kind]}`));
    if (input.audience === "coding") {
      const models = modelNouns(notes);
      if (models.length >= 2) push(section("model", "Things worth modeling", bullets(models, 8)));
    }
  }
  push(section("questions", "Open questions", bullets(gaps, cap.questions)));

  const readiness: Readiness[] = [
    { id: "goal", label: "Goal", present: goal.length > 0 },
    { id: "who", label: "Audience", present: Boolean(who) },
    { id: "reqs", label: "Requirements", present: requirementLines.length > 0 },
    {
      id: "bounds",
      label: "Boundaries",
      present: constraintLines.length + exclusionLines.length > 0,
    },
  ];

  return {
    title,
    intro,
    markdown: renderMarkdown(title, intro, sections, input.audience),
    sections,
    readiness,
  };
}

export function splitPrompt(markdown: string): { title: string; intro: string; sections: PromptSection[] } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.startsWith("# "));
  const title =
    titleIndex >= 0
      ? lines[titleIndex].replace(/^#\s+/, "").replace(/^(?:Build prompt|Product brief|Design brief):\s*/i, "")
      : "Structured prompt";
  const after = lines.slice(titleIndex + 1);
  const firstHeading = after.findIndex((line) => line.startsWith("## "));
  const intro = (firstHeading === -1 ? after : after.slice(0, firstHeading)).join("\n").trim();
  const rest = firstHeading === -1 ? "" : after.slice(firstHeading).join("\n");
  const sections = rest
    .split(/\n(?=## )/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const [headingLine, ...bodyLines] = chunk.split("\n");
      return {
        id: `s-${index}`,
        heading: headingLine.replace(/^##\s+/, "").trim(),
        body: bodyLines.join("\n").trim(),
      };
    });
  return { title, intro, sections };
}

export function promptFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "prompt"}.md`;
}
