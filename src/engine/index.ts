import { recommendScale } from "./classify";
import { composePrompt } from "./compose";
import { clarifyingQuestions } from "./questions";
import { reviewBrief } from "./review";
import type { AgentResult, TaskIntake, TaskScale } from "./types";

export function runAgent(intake: TaskIntake, scaleOverride: TaskScale | null): AgentResult {
  const recommendation = recommendScale(intake);
  const scale = scaleOverride ?? recommendation.scale;
  const prompt = composePrompt(intake, scale);
  const questions = clarifyingQuestions(intake, scale);
  const review = reviewBrief(intake, scale, prompt, recommendation);
  return {
    recommendation,
    scale,
    usedOverride: scaleOverride !== null && scaleOverride !== recommendation.scale,
    questions,
    prompt,
    review,
  };
}

export { recommendScale } from "./classify";
export { composePrompt } from "./compose";
export { clarifyingQuestions } from "./questions";
export { reviewBrief } from "./review";
export { STARTERS, SAMPLE_INTAKE } from "./starters";
export {
  EMPTY_INTAKE,
  FUNCTION_LABELS,
  SCALE_ORDER,
  type AgentResult,
  type BusinessFunction,
  type ClarifyingQuestion,
  type ComposedPrompt,
  type Finding,
  type PromptSection,
  type Review,
  type ScaleRecommendation,
  type TaskIntake,
  type TaskScale,
} from "./types";
