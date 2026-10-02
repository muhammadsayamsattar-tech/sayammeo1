import { clean, hasVagueOpening, impliesFormat, wordCount } from "./text";
import type { ComposedPrompt, Finding, Review, ScaleRecommendation, TaskIntake, TaskScale } from "./types";

export function reviewBrief(
  intake: TaskIntake,
  scale: TaskScale,
  prompt: ComposedPrompt,
  recommendation: ScaleRecommendation,
): Review {
  const gaps: Finding[] = [];
  const watches: Finding[] = [];
  const goods: Finding[] = [];
  const request = clean(intake.request);

  if (wordCount(request) < 8) {
    gaps.push({
      level: "gap",
      text: "The task needs a concrete deliverable before this prompt is worth pasting.",
    });
  }

  const formatKnown = Boolean(clean(intake.outputHint)) || impliesFormat(request);
  if (request && !formatKnown) {
    gaps.push({
      level: "gap",
      text: "Add the finished shape — email, memo, table, list — so the model does not invent one.",
    });
  }

  if (scale === "large" && request && !clean(intake.nonGoals) && !/\bout of scope\b/i.test(request)) {
    gaps.push({
      level: "gap",
      text: "Name one non-goal. Large prompts stay bounded when they say what to refuse.",
    });
  }

  if (scale === "large" && request && !clean(intake.success)) {
    gaps.push({
      level: "gap",
      text: "Add a done-when line. It becomes the acceptance check.",
    });
  }

  if (hasVagueOpening(request)) {
    watches.push({
      level: "watch",
      text: "Open on the deliverable — draft, decide, compare, reply — so finished has a shape.",
    });
  }

  if (scale === "medium" && request && !clean(intake.success)) {
    watches.push({
      level: "watch",
      text: "A done-when line would give the quality bar something exact to check.",
    });
  }

  if (prompt.wordCount > prompt.budgetMax) {
    watches.push({
      level: "watch",
      text: `The brief is over the ${scale} word budget. Keep facts the model must use, and cut the rest.`,
    });
  }

  if (recommendation.runnerUp && recommendation.scale === scale) {
    watches.push({
      level: "watch",
      text: `Sizing was close with ${recommendation.runnerUp}. Read both structures if the stakes feel higher or lower than they look.`,
    });
  }

  if (prompt.assumptions.length > 0) {
    watches.push({
      level: "watch",
      text: "The prompt is carrying assumptions. Swap them for facts before the work is customer-facing or board-facing.",
    });
  }

  if (request && formatKnown) {
    goods.push({ level: "good", text: "The output shape is explicit." });
  }
  if (clean(intake.constraints)) {
    goods.push({ level: "good", text: "Limits are written into the prompt." });
  }
  if (prompt.wordCount <= prompt.budgetMax && request) {
    goods.push({ level: "good", text: `Length fits the ${scale} budget.` });
  }

  const findings = [...gaps, ...watches, ...goods].slice(0, 5);
  const status = gaps.length > 0 ? "incomplete" : watches.length > 0 ? "tighten" : "ready";
  return { status, findings };
}
