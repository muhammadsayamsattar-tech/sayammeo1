import { budgetFor, bullets, clean, impliesFormat, titleFrom, voiceFor, wordCount } from "./text";
import { FUNCTION_LABELS, type ComposedPrompt, type OmittedSection, type PromptSection, type TaskIntake, type TaskScale } from "./types";

const PREAMBLE: Record<TaskScale, string> = {
  small:
    "This is a small task. Do the work in the output spec and stop. Do not add strategy, alternatives, or a process narrative.",
  medium:
    "This is a medium task. Produce one decision-ready deliverable. Stay inside the requirements and the quality bar.",
  large:
    "This is a large task. Work in the phases below. Hold the scope boundary and the acceptance checks. Ask for missing must-have facts in one batch, then proceed on the stated assumptions.",
};

const OMITTED: Record<TaskScale, OmittedSection[]> = {
  small: [
    {
      title: "Role essay",
      reason: "A short deliverable does not get better when the model is asked to play a character.",
    },
    {
      title: "Work plan",
      reason: "Phases invite extra writing. Small work should finish in the output itself.",
    },
    {
      title: "Stakeholder map",
      reason: "People and governance belong on medium and large briefs.",
    },
  ],
  medium: [
    {
      title: "Phased program plan",
      reason: "A method of a few steps is enough. A phase plan is for multi-workstream efforts.",
    },
    {
      title: "Decision-rights register",
      reason: "The quality bar carries the standard. A rights matrix waits for large work.",
    },
  ],
  large: [
    {
      title: "Padding",
      reason: "Every section has a job. Background that does not change a decision stays out.",
    },
  ],
};

function outputBody(intake: TaskIntake, scale: TaskScale): string {
  const hint = clean(intake.outputHint);
  if (hint) {
    return `Produce exactly this:\n\n${hint}\n\nNo preamble, no recap of these instructions, and no extra sections the format does not call for.`;
  }
  if (impliesFormat(intake.request)) {
    return "Match the format named in the task. Deliver the piece itself, without a wrapper that explains the piece.";
  }
  if (scale === "small") {
    return "A single finished piece the reader can use as-is. No outline of how you got there.";
  }
  if (scale === "medium") {
    return "A decision-ready document: the answer first, then the supporting points, then open questions. Use headings and bullets.";
  }
  return "A package with four parts: (1) a one-page decision note, (2) the analysis behind it, (3) assumptions and open questions, (4) next actions with owners.";
}

function contextLines(intake: TaskIntake, scale: TaskScale): string[] {
  const lines = [`Business area: ${FUNCTION_LABELS[intake.function]}.`];
  if (clean(intake.audience)) lines.push(`Reader: ${clean(intake.audience)}.`);
  if (clean(intake.deadline) && scale !== "large") lines.push(`Deadline: ${clean(intake.deadline)}.`);
  if (clean(intake.owner) && scale === "medium") lines.push(`Decision owner: ${clean(intake.owner)}.`);
  if (clean(intake.sources)) {
    lines.push("Use these sources and no others:");
    lines.push(bullets(intake.sources));
    lines.push("If a source is silent on a point, say so.");
  } else {
    lines.push("Treat this brief as the only source of facts. Do not invent figures, quotes, dates, or policy.");
  }
  return lines;
}

function requirementLines(intake: TaskIntake, scale: TaskScale): string[] {
  const lines: string[] = [];
  if (clean(intake.constraints)) {
    lines.push("Must respect:");
    lines.push(bullets(intake.constraints));
  }
  if (clean(intake.nonGoals) && scale !== "large") {
    lines.push("Do not do:");
    lines.push(bullets(intake.nonGoals));
  }
  if (lines.length === 0) {
    lines.push("Must follow the task statement and the output spec.");
    lines.push("Do not widen the work to adjacent projects, history, or advice that was not asked for.");
  }
  return lines;
}

function joinBlocks(blocks: string[]): string {
  return blocks.filter((block) => clean(block.replace(/[-•]/g, ""))).join("\n\n");
}

function section(id: string, title: string, body: string): PromptSection {
  return { id, title, body: body.trim() };
}

function assumptionsFor(intake: TaskIntake, scale: TaskScale): string[] {
  const assumptions: string[] = [];
  if (!clean(intake.audience) && scale !== "small") {
    assumptions.push("Reader assumed: an internal operator who will act on the result.");
  }
  if (!clean(intake.audience) && scale === "small" && /\b(e-?mail|reply|message|memo)\b/i.test(intake.request)) {
    assumptions.push("Reader assumed from the task. Confirm the name and relationship before sending.");
  }
  if (!clean(intake.success) && scale === "large") {
    assumptions.push("Success is assumed to be a decision the owner can defend, with assumptions labeled.");
  }
  if (!clean(intake.nonGoals) && scale === "large") {
    assumptions.push("Out of scope defaults to anything that does not change the stated outcome.");
  }
  if (!clean(intake.owner) && scale === "large") {
    assumptions.push("No decision owner was named. The prompt tells the model to surface tradeoffs instead of burying them.");
  }
  return assumptions;
}

function composeSmall(intake: TaskIntake): PromptSection[] {
  const task = clean(intake.request) || "Describe the business task in one or two sentences.";
  const constraints = clean(intake.constraints);
  return [
    section("task", "Task", task),
    section("context", "Context", contextLines(intake, "small").join("\n")),
    section(
      "constraints",
      "Constraints",
      constraints
        ? bullets(intake.constraints)
        : "No extra limits were given. Stay inside the task and the output spec.",
    ),
    section("output", "Output", outputBody(intake, "small")),
    section(
      "rules",
      "Working rules",
      `${voiceFor(intake.function)}\n\n- Use only facts in this brief. If a required fact is missing, ask one question or mark it [needed].\n- Stop when the output spec is met.`,
    ),
  ];
}

function composeMedium(intake: TaskIntake): PromptSection[] {
  const task = clean(intake.request) || "Describe the deliverable and the decision it supports.";
  const success = clean(intake.success);
  return [
    section("role", "Role", voiceFor(intake.function)),
    section(
      "objective",
      "Objective",
      success ? `${task}\n\nDone when:\n${bullets(intake.success)}` : task,
    ),
    section("context", "Context", contextLines(intake, "medium").join("\n")),
    section("requirements", "Requirements", requirementLines(intake, "medium").join("\n\n")),
    section(
      "method",
      "Method",
      [
        "1. Restate the deliverable in one sentence.",
        "2. Separate facts, assumptions, and recommendations.",
        "3. Do the work in the order the output spec implies.",
        "4. Check the result against the quality bar before you finish.",
      ].join("\n"),
    ),
    section("output", "Output", outputBody(intake, "medium")),
    section(
      "quality",
      "Quality bar",
      [
        "- A busy operator can act after the first screen.",
        "- Claims trace to the brief or are labeled as assumptions.",
        "- Tradeoffs are visible where a choice was made.",
        "- Nothing in the deliverable contradicts the constraints.",
      ].join("\n"),
    ),
    section(
      "rules",
      "Working rules",
      [
        "- Do not expand scope.",
        "- Prefer bullets unless the output spec asks for prose.",
        "- If a must-have fact is missing, list it once, then proceed with a labeled assumption.",
      ].join("\n"),
    ),
  ];
}

function composeLarge(intake: TaskIntake): PromptSection[] {
  const task = clean(intake.request) || "Describe the outcome this work has to change.";
  const owner = clean(intake.owner) || "Not named. Surface tradeoffs for a human to call.";
  const stakeholders = clean(intake.stakeholders) || "Not listed. Address the decision owner and mark others as unknown.";
  const nonGoals = clean(intake.nonGoals)
    ? bullets(intake.nonGoals)
    : "- Anything that does not change the outcome in this brief.";
  const success = clean(intake.success)
    ? bullets(intake.success)
    : "- The decision owner can accept, reject, or redirect the recommendation without asking for a rewrite of the structure.";

  return [
    section(
      "engagement",
      "Engagement",
      joinBlocks([
        voiceFor(intake.function),
        `Decision owner: ${owner}.`,
        clean(intake.deadline) ? `Horizon: ${clean(intake.deadline)}.` : "Horizon: not set. Do not invent a launch date or a fiscal period.",
      ]),
    ),
    section(
      "outcome",
      "Outcome",
      `${task}\n\nJudge the finished package against the acceptance section.`,
    ),
    section("situation", "Situation", contextLines(intake, "large").join("\n")),
    section(
      "scope",
      "Scope",
      joinBlocks([
        "In scope: the outcome, the requirements, and the deliverable package in this brief.",
        `Out of scope:\n${nonGoals}`,
        "Assumptions you introduce must be labeled. Do not treat an assumption as a fact later in the work.",
      ]),
    ),
    section(
      "stakeholders",
      "Stakeholders",
      [`People affected: ${stakeholders}.`, "When interests conflict, name the conflict and leave the call with the decision owner."].join(
        "\n\n",
      ),
    ),
    section("requirements", "Requirements", requirementLines(intake, "large").join("\n\n")),
    section(
      "plan",
      "Work plan",
      [
        "Phase 1 — Frame. Restate the outcome, the scope, and the assumptions. Stop if a must-have fact is missing and ask for it in one list.",
        "Phase 2 — Diagnose. Say what is true from the sources, what is inferred, and what is unknown.",
        "Phase 3 — Options. Give two or three real options with tradeoffs against the outcome. Recommend one.",
        "Phase 4 — Package. Produce the deliverables, the owners, and the acceptance checks.",
        "After each phase, list open questions before continuing.",
      ].join("\n"),
    ),
    section(
      "decisions",
      "Decision rules",
      [
        "- Prefer a reversible move when the cost of waiting is low.",
        "- Do not invent metrics, customer facts, legal positions, or quotes.",
        "- If sources disagree, show both and say which one you used.",
        "- Optimize for the outcome in this brief, and show what you gave up.",
      ].join("\n"),
    ),
    section(
      "risks",
      "Risks",
      "Use only risks implied by the constraints and the situation. If none are stated, name the two assumptions most likely to change the recommendation, and what to do if each is wrong.",
    ),
    section("deliverables", "Deliverables", outputBody(intake, "large")),
    section("acceptance", "Acceptance", success),
    section(
      "rules",
      "Working rules",
      [
        "- Cite the brief when you rely on it. Label everything else as an assumption.",
        "- The opening note must change a decision. Do not repeat this brief back as an executive summary.",
        "- Ask at most one batch of questions, then proceed.",
      ].join("\n"),
    ),
  ];
}

function efficiencyNotes(scale: TaskScale, words: number, assumptions: string[]): string[] {
  const budget = budgetFor(scale);
  const notes = [
    words <= budget
      ? `${words} words, inside the ${scale} budget of ${budget}.`
      : `${words} words, ${words - budget} over the ${budget}-word ${scale} budget. Move extra background into the source field only if the model must use it.`,
  ];
  if (scale === "small") {
    notes.push("Four working sections plus a short rule block. Heavier structure stays out.");
  } else if (scale === "medium") {
    notes.push("Role, method, and a quality bar are included. Program phases stay out.");
  } else {
    notes.push("Scope, phases, decision rules, and acceptance are included so the work stays bounded.");
  }
  if (assumptions.length > 0) {
    notes.push(`${assumptions.length} assumption${assumptions.length === 1 ? "" : "s"} stand in for missing facts. Replace them when you know more.`);
  }
  return notes;
}

export function composePrompt(intake: TaskIntake, scale: TaskScale): ComposedPrompt {
  const sections =
    scale === "small" ? composeSmall(intake) : scale === "medium" ? composeMedium(intake) : composeLarge(intake);
  const assumptions = assumptionsFor(intake, scale);
  const preamble = PREAMBLE[scale];
  const body = sections.map((item) => `# ${item.title}\n${item.body}`).join("\n\n");
  const assumptionBlock =
    assumptions.length > 0 ? `\n\n# Assumptions in force\n${assumptions.map((item) => `- ${item}`).join("\n")}` : "";
  const markdown = `${preamble}\n\n${body}${assumptionBlock}`;

  return {
    scale,
    title: titleFrom(intake.request),
    preamble,
    sections,
    markdown,
    wordCount: wordCount(markdown),
    budgetMax: budgetFor(scale),
    efficiencyNotes: efficiencyNotes(scale, wordCount(markdown), assumptions),
    omitted: OMITTED[scale],
    assumptions,
  };
}
