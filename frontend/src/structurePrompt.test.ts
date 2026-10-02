import { describe, expect, it } from "vitest";
import { examples } from "./examples";
import { splitPrompt, structurePrompt } from "./structurePrompt";

describe("structurePrompt", () => {
  it("turns tool-library notes into a coding prompt", () => {
    const example = examples[0];
    const result = structurePrompt(example);

    expect(result.title).toMatch(/tool library/i);
    expect(result.markdown.startsWith("# Build prompt:")).toBe(true);
    expect(result.markdown).toMatch(/phone-first app/i);
    expect(result.markdown).toMatch(/map of what's nearby/i);
    expect(result.markdown).toMatch(/drill/i);
    expect(result.markdown).toMatch(/magic links/i);
    expect(result.markdown).toMatch(/Should work on phones/);
    expect(result.markdown).toMatch(/Leave out: logins with passwords/);
    expect(result.markdown).toMatch(/Primary audience: neighbors/);
    expect(result.markdown).toMatch(/How should nearby be decided/);
    expect(result.readiness.every((item) => item.present)).toBe(true);

    const parsed = splitPrompt(result.markdown);
    expect(parsed.title).toBe(result.title);
    expect(parsed.sections.map((section) => section.heading)).toEqual(result.sections.map((section) => section.heading));
  });

  it("writes a product brief and keeps exclusions", () => {
    const result = structurePrompt(examples[1]);

    expect(result.markdown.startsWith("# Product brief:")).toBe(true);
    expect(result.title).toMatch(/invoice/i);
    expect(result.markdown).toMatch(/Primary audience: freelance illustrators/);
    expect(result.markdown).toMatch(/Should not feel like spreadsheets/);
    expect(result.markdown).toMatch(/Leave out: accounting software clone/);
    expect(result.markdown).toMatch(/A person can send a pretty invoice/);
    expect(result.markdown).toMatch(/Tone already described: simple, pretty/);
    expect(result.markdown).not.toMatch(/senior engineer/);
    expect(result.markdown).toMatch(/failed payment/i);
  });

  it("includes a labeled suggestion only in a thorough coding prompt", () => {
    const result = structurePrompt(examples[2]);

    expect(result.markdown).toMatch(/Named in the notes: Obsidian/);
    expect(result.markdown).toMatch(/Leave out: database/);
    expect(result.markdown).toMatch(/Suggestion, not a requirement:/);
    expect(result.markdown).toMatch(/Who is this for if I am the only author\?/);
    expect(result.markdown).toMatch(/Things worth modeling/);
    expect(result.markdown).not.toMatch(/I use Obsidian/);
  });

  it("changes the brief when the audience changes", () => {
    const notes = examples[0].notes;
    const design = structurePrompt({ ...examples[0], audience: "design", notes });
    expect(design.markdown.startsWith("# Design brief:")).toBe(true);
    expect(design.markdown).toMatch(/## Jobs to be done/);
    expect(design.markdown).toMatch(/Do not specify an implementation/);
  });

  it("asks for the missing pieces instead of inventing them", () => {
    const result = structurePrompt({
      notes: "Something small for the weekend.",
      kind: "web",
      audience: "coding",
      depth: "standard",
    });

    expect(result.readiness.find((item) => item.id === "who")?.present).toBe(false);
    expect(result.readiness.find((item) => item.id === "reqs")?.present).toBe(false);
    expect(result.markdown).toMatch(/Who is the primary person/);
    expect(result.markdown).toMatch(/What should a person be able to do/);
    expect(result.markdown).not.toMatch(/Primary audience:/);
  });

  it("uses a working title when one is given", () => {
    const result = structurePrompt({
      ...examples[0],
      projectName: "Borrow",
    });
    expect(result.title).toBe("Borrow");
    expect(result.markdown).toMatch(/# Build prompt: Borrow/);
  });
});
