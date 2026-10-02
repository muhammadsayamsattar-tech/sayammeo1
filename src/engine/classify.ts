import { clean } from "./text";
import type { ScaleRecommendation, TaskIntake, TaskScale } from "./types";

interface Note {
  scale: TaskScale;
  weight: number;
  reason: string;
}

const SMALL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(reply|e-?mail reply|thank[- ]you note|slack message|teams message)\b/i,
    reason: "The deliverable is one message.",
  },
  {
    pattern: /\bunder\s+\d+\s+words\b/i,
    reason: "A word cap marks this as a short piece of writing.",
  },
  {
    pattern: /\b(rewrite|rephrase|proofread|shorten|tighten)\b/i,
    reason: "The work is an edit of something that already exists.",
  },
  {
    pattern: /\b(summari[sz]e|tl;dr|tldr)\b/i,
    reason: "The work is a summary, which should stay shorter than the source.",
  },
  {
    pattern: /\b(headlines?|captions?)\b/i,
    reason: "The deliverable is a single short line.",
  },
  {
    pattern: /\bsubject lines?\b/i,
    reason: "A subject line is part of the deliverable, so the piece stays short.",
  },
  {
    pattern: /\b(quick|briefly|in one sentence)\b/i,
    reason: "The ask is explicitly short.",
  },
];

const MEDIUM_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(decision memos?|memos?|one-?pagers?|one-?page)\b/i,
    reason: "A memo or one-pager needs a point of view, not a program plan.",
  },
  {
    pattern: /\b(sops?|standard operating procedures?|playbooks?|processes?)\b/i,
    reason: "A process document needs steps, owners, and exceptions.",
  },
  {
    pattern: /\b(proposals?|compar(?:e|ing|ison|isons)|versus|vs\.?)\b/i,
    reason: "A comparison or proposal has to reach a recommendation.",
  },
  {
    pattern: /\b(analy[sz]e|analysis|recommendations?|recommend)\b/i,
    reason: "The task asks for judgment, so the prompt needs a quality bar.",
  },
  {
    pattern: /\b(checklists?|agendas?|outlines?|reports?|briefs?)\b/i,
    reason: "The deliverable is a structured work product with several parts.",
  },
];

const LARGE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(operating plans?|operating models?|roadmaps?|transformations?)\b/i,
    reason: "Operating plans, roadmaps, and transformations need scope and phases.",
  },
  {
    pattern: /\b(board|governance|workstreams?|stakeholders?)\b/i,
    reason: "Board, governance, workstream, or stakeholder language means several parties.",
  },
  {
    pattern: /\b(due diligence|go-to-market|market-?entr(?:y|ies)|gtm|change management|business cases?)\b/i,
    reason: "This is a high-stakes package with tradeoffs to make explicit.",
  },
  {
    pattern: /\b(multi-?quarter|two-?quarter|three-?year|company-?wide|org(?:anization)?-?wide)\b/i,
    reason: "The time horizon or reach is company-scale.",
  },
  {
    pattern: /\b(rfp responses?|investment memos?|program plans?)\b/i,
    reason: "The deliverable is a full decision package.",
  },
];

function addMatches(
  notes: Note[],
  text: string,
  scale: TaskScale,
  patterns: Array<{ pattern: RegExp; reason: string }>,
  weight: number,
) {
  for (const entry of patterns) {
    if (entry.pattern.test(text)) {
      notes.push({ scale, weight, reason: entry.reason });
    }
  }
}

export function recommendScale(intake: TaskIntake): ScaleRecommendation {
  const request = clean(intake.request);
  const text = [
    intake.request,
    intake.outputHint,
    intake.constraints,
    intake.success,
    intake.nonGoals,
    intake.stakeholders,
  ]
    .map(clean)
    .filter(Boolean)
    .join("\n");

  if (!request) {
    return {
      scale: "medium",
      confidence: "close",
      reasons: ["Add the task and Stride will size it. Medium is the holding default."],
      runnerUp: null,
    };
  }

  const notes: Note[] = [];
  const length = request.length;

  if (length < 280) {
    notes.push({
      scale: "small",
      weight: 1,
      reason: "The task statement is short enough to brief in a few lines.",
    });
  }
  if (length >= 180 && length < 700) {
    notes.push({
      scale: "medium",
      weight: 1,
      reason: "There is enough detail to need a method, and not enough to need a program brief.",
    });
  }
  if (length >= 500) {
    notes.push({
      scale: "large",
      weight: 1,
      reason: "The task statement is long, which usually means several constraints to hold at once.",
    });
  }
  if (length >= 900) {
    notes.push({
      scale: "large",
      weight: 1,
      reason: "The brief is already a page. The prompt should organize it, not add bulk.",
    });
  }

  addMatches(notes, text, "small", SMALL_PATTERNS, 2);
  addMatches(notes, text, "medium", MEDIUM_PATTERNS, 2);
  addMatches(notes, text, "large", LARGE_PATTERNS, 4);

  if (clean(intake.stakeholders)) {
    notes.push({
      scale: "large",
      weight: 2,
      reason: "Named stakeholders mean the prompt should say who decides and who is affected.",
    });
  }
  if (clean(intake.nonGoals)) {
    notes.push({
      scale: "large",
      weight: 1,
      reason: "A non-goal is a scope boundary, which large work needs on the page.",
    });
    notes.push({
      scale: "medium",
      weight: 1,
      reason: "A stated non-goal gives a medium task a clean edge.",
    });
  }
  if (clean(intake.owner)) {
    notes.push({
      scale: "large",
      weight: 1,
      reason: "A decision owner is set, so the prompt can assign the call.",
    });
  }

  const connectorCount = text.match(/\b(and|plus|also)\b/gi)?.length ?? 0;
  if (connectorCount >= 5) {
    notes.push({
      scale: "large",
      weight: 2,
      reason: "The ask chains several jobs. Large scale keeps them in phases instead of one blob.",
    });
  } else if (connectorCount >= 3) {
    notes.push({
      scale: "medium",
      weight: 1,
      reason: "There is more than one part, so the prompt should set an order of work.",
    });
  }

  const scores: Record<TaskScale, number> = { small: 0, medium: 0, large: 0 };
  for (const note of notes) scores[note.scale] += note.weight;

  const leanness: Record<TaskScale, number> = { small: 0, medium: 1, large: 2 };
  const ranked = (Object.keys(scores) as TaskScale[]).sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return leanness[a] - leanness[b];
  });
  const scale = ranked[0];
  const runnerUp = ranked[1];
  const gap = scores[scale] - scores[runnerUp];
  const confidence = gap >= 3 ? "clear" : gap >= 2 ? "likely" : "close";

  const reasons = notes
    .filter((note) => note.scale === scale)
    .sort((a, b) => b.weight - a.weight)
    .map((note) => note.reason)
    .filter((reason, index, all) => all.indexOf(reason) === index)
    .slice(0, 3);

  if (reasons.length === 0) {
    reasons.push("The task sits in the middle: one deliverable, some judgment, and a bounded scope.");
  }

  return {
    scale,
    confidence,
    reasons,
    runnerUp: gap <= 1 ? runnerUp : null,
  };
}
