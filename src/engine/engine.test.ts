import { describe, expect, it } from "vitest";
import { composePrompt, EMPTY_INTAKE, recommendScale, runAgent, STARTERS } from "./index";

const starter = (id: string) => {
  const found = STARTERS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing starter ${id}`);
  return found.intake;
};

describe("recommendScale", () => {
  it("sizes a customer reply as small", () => {
    const result = recommendScale(starter("refund"));
    expect(result.scale).toBe("small");
    expect(result.confidence).not.toBe("close");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("sizes a meeting follow-up as small", () => {
    expect(recommendScale(starter("follow-up")).scale).toBe("small");
  });

  it("sizes a vendor memo and a sales SOP as medium", () => {
    expect(recommendScale(starter("vendor")).scale).toBe("medium");
    expect(recommendScale(starter("sop")).scale).toBe("medium");
  });

  it("sizes an operating plan and a market-entry brief as large", () => {
    expect(recommendScale(starter("operating-plan")).scale).toBe("large");
    expect(recommendScale(starter("market-entry")).scale).toBe("large");
  });

  it("holds an empty task at medium until there is a deliverable", () => {
    const result = recommendScale(EMPTY_INTAKE);
    expect(result.scale).toBe("medium");
    expect(result.confidence).toBe("close");
    expect(result.reasons[0]).toMatch(/Add the task/i);
  });

  it("prefers the leaner scale when the scores tie", () => {
    const result = recommendScale({
      ...EMPTY_INTAKE,
      request:
        "Write a weekly note for the operating team. Cover attendance, the open roles, and the office move. Keep the language plain so a new manager can follow it on Monday morning without calling another meeting.",
    });
    expect(result.scale).toBe("small");
    expect(result.runnerUp).toBe("medium");
  });
});

describe("composePrompt", () => {
  it("keeps a small prompt on the deliverable", () => {
    const prompt = composePrompt(starter("refund"), "small");
    expect(prompt.sections.map((section) => section.id)).toEqual([
      "task",
      "context",
      "constraints",
      "output",
      "rules",
    ]);
    expect(prompt.markdown).toContain("This is a small task.");
    expect(prompt.markdown).toContain("under 120 words");
    expect(prompt.markdown).toContain("Do not blame the customer or the billing vendor.");
    expect(prompt.markdown).not.toContain("# Work plan");
    expect(prompt.markdown).not.toContain("# Stakeholders");
    expect(prompt.wordCount).toBeGreaterThan(40);
    expect(prompt.wordCount).toBeLessThanOrEqual(prompt.budgetMax);
  });

  it("gives medium work a method and a quality bar", () => {
    const prompt = composePrompt(starter("vendor"), "medium");
    expect(prompt.markdown).toContain("# Quality bar");
    expect(prompt.markdown).toContain("# Method");
    expect(prompt.markdown).toContain("COO");
    expect(prompt.markdown).not.toContain("# Work plan");
    expect(prompt.sections.length).toBeGreaterThan(composePrompt(starter("vendor"), "small").sections.length);
  });

  it("bounds large work with scope, phases, and acceptance", () => {
    const prompt = composePrompt(starter("operating-plan"), "large");
    expect(prompt.markdown).toContain("# Scope");
    expect(prompt.markdown).toContain("# Work plan");
    expect(prompt.markdown).toContain("# Acceptance");
    expect(prompt.markdown).toContain("Rebrand, new product lines, and international expansion.");
    expect(prompt.markdown).toContain("CEO");
    expect(prompt.sections.length).toBeGreaterThan(composePrompt(starter("operating-plan"), "medium").sections.length);
    expect(prompt.wordCount).toBeLessThanOrEqual(prompt.budgetMax);
  });

  it("states assumptions instead of inventing a reader", () => {
    const prompt = composePrompt(
      {
        ...EMPTY_INTAKE,
        function: "strategy",
        request: "Draft a decision memo on whether to renew the warehouse lease. Recommend one option.",
        outputHint: "A one-page memo.",
      },
      "medium",
    );
    expect(prompt.assumptions.some((item) => item.startsWith("Reader assumed"))).toBe(true);
    expect(prompt.markdown).toContain("# Assumptions in force");
  });

  it("still returns a prompt when the task is empty", () => {
    const prompt = composePrompt(EMPTY_INTAKE, "small");
    expect(prompt.markdown).toContain("Describe the business task");
    expect(prompt.wordCount).toBeGreaterThan(0);
  });
});

describe("runAgent", () => {
  it("marks a complete small brief ready to paste", () => {
    const result = runAgent(starter("refund"), null);
    expect(result.scale).toBe("small");
    expect(result.usedOverride).toBe(false);
    expect(result.questions).toHaveLength(0);
    expect(result.review.status).toBe("ready");
    expect(result.review.findings.some((finding) => finding.level === "gap")).toBe(false);
  });

  it("asks only for facts that would change a thin task", () => {
    const result = runAgent(
      {
        ...EMPTY_INTAKE,
        request: "Help me improve onboarding.",
      },
      null,
    );
    expect(result.questions.length).toBeLessThanOrEqual(2);
    expect(result.questions.map((question) => question.field)).toContain("outputHint");
    expect(result.review.findings.some((finding) => finding.level === "gap")).toBe(true);
    expect(result.review.findings.some((finding) => finding.text.includes("deliverable"))).toBe(true);
    expect(result.review.status).toBe("incomplete");
  });

  it("asks a large brief for scope and acceptance when those facts are missing", () => {
    const result = runAgent(
      {
        ...EMPTY_INTAKE,
        function: "strategy",
        request:
          "Build a two-quarter operating plan with governance, workstreams, and a board-ready recommendation for the sales motion.",
      },
      null,
    );
    expect(result.scale).toBe("large");
    expect(result.questions.map((question) => question.field)).toEqual(
      expect.arrayContaining(["nonGoals", "success"]),
    );
    expect(result.questions.length).toBeLessThanOrEqual(6);
    expect(result.review.status).toBe("incomplete");
  });

  it("follows an explicit size override without changing the recommendation", () => {
    const intake = starter("refund");
    const result = runAgent(intake, "large");
    expect(result.recommendation.scale).toBe("small");
    expect(result.scale).toBe("large");
    expect(result.usedOverride).toBe(true);
    expect(result.prompt.markdown).toContain("# Work plan");
    expect(result.prompt.omitted.map((item) => item.title)).toContain("Padding");
  });

  it("drops heavy sections on purpose for smaller work", () => {
    const small = runAgent(starter("operating-plan"), "small");
    expect(small.prompt.omitted.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Role essay", "Work plan", "Stakeholder map"]),
    );
    expect(small.prompt.markdown).not.toContain("# Work plan");
  });
});
