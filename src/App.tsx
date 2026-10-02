import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_INTAKE,
  FUNCTION_LABELS,
  SAMPLE_INTAKE,
  SCALE_ORDER,
  STARTERS,
  runAgent,
  type BusinessFunction,
  type TaskIntake,
  type TaskScale,
} from "./engine";

const SCALE_META: Record<TaskScale, { label: string; detail: string; blurb: string }> = {
  small: {
    label: "Small",
    detail: "One deliverable",
    blurb: "A reply, a rewrite, a short list. The prompt stays on the piece and then stops.",
  },
  medium: {
    label: "Medium",
    detail: "A work product",
    blurb: "A memo, an SOP, a comparison. The prompt adds a role, a method, and a quality bar.",
  },
  large: {
    label: "Large",
    detail: "A bounded program",
    blurb: "A plan with stakeholders and tradeoffs. The prompt sets scope, phases, and acceptance.",
  },
};

const STATUS_LABEL = {
  ready: "Ready to paste",
  tighten: "Check the notes, then paste",
  incomplete: "Add the missing fact",
} as const;

const CONFIDENCE_LABEL = {
  clear: "Clear fit",
  likely: "Likely fit",
  close: "Close call",
} as const;

function RichBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter((line) => line.trim());
        if (lines.length > 0 && lines.every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.trim().slice(2)}</li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((line) => /^\d+\.\s/.test(line.trim()))) {
          return (
            <ol key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.trim().replace(/^\d+\.\s/, "")}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function fileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "stride-prompt";
}

export function App() {
  const [intake, setIntake] = useState<TaskIntake>(SAMPLE_INTAKE);
  const [sample, setSample] = useState(true);
  const [override, setOverride] = useState<TaskScale | null>(null);
  const [sourceView, setSourceView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const result = useMemo(() => runAgent(intake, override), [intake, override]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function update<K extends keyof TaskIntake>(key: K, value: TaskIntake[K]) {
    setSample(false);
    setIntake((current) => ({ ...current, [key]: value }));
  }

  function applyStarter(next: TaskIntake) {
    setSample(false);
    setOverride(null);
    setIntake(next);
    setSourceView(false);
  }

  function clearBrief() {
    setSample(false);
    setOverride(null);
    setIntake(EMPTY_INTAKE);
    setSourceView(false);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(result.prompt.markdown);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  function downloadPrompt() {
    const blob = new Blob([result.prompt.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileSlug(result.prompt.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function focusField(field: keyof TaskIntake) {
    document.getElementById(`field-${field}`)?.focus();
  }

  return (
    <div className="studio">
      <header className="top">
        <div className="brand">
          <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="18" width="6" height="10" rx="1" />
            <rect x="13" y="11" width="6" height="17" rx="1" />
            <rect x="23" y="4" width="6" height="24" rx="1" />
          </svg>
          <div>
            <h1>Stride</h1>
            <p>Business prompt studio. Size the prompt to the task.</p>
          </div>
        </div>
        <p className="privacy">The brief stays in this browser.</p>
      </header>

      <div className="layout">
        <section className="panel" aria-labelledby="brief-heading">
          <div className="panel-head">
            <h2 id="brief-heading">The work</h2>
            <button type="button" className="text-button" onClick={clearBrief}>
              Clear brief
            </button>
          </div>
          {sample ? <p className="sample-note">Sample brief. Replace it with your own task.</p> : null}

          <div className="scales" role="group" aria-label="Task size">
            {SCALE_ORDER.map((scale) => {
              const selected = result.scale === scale;
              const suggested = result.recommendation.scale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  className={`scale scale-${scale}`}
                  aria-pressed={selected}
                  onClick={() => setOverride(scale === result.recommendation.scale ? null : scale)}
                >
                  <span className="scale-kicker">
                    {SCALE_META[scale].detail}
                    {suggested ? <em>Suggested</em> : null}
                  </span>
                  <strong>{SCALE_META[scale].label}</strong>
                </button>
              );
            })}
          </div>
          <p className="blurb">{SCALE_META[result.scale].blurb}</p>

          <div className="why">
            <h3>Why this size</h3>
            <p className="confidence">{CONFIDENCE_LABEL[result.recommendation.confidence]}</p>
            <ul>
              {result.recommendation.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {result.usedOverride ? (
              <p className="override-note">
                Stride sized this as {result.recommendation.scale}. The prompt follows your choice of {result.scale}.
              </p>
            ) : result.recommendation.runnerUp ? (
              <p className="override-note">
                {SCALE_META[result.recommendation.runnerUp].label} was close. Choose it if the stakes feel different.
              </p>
            ) : null}
          </div>

          <label htmlFor="field-request">Task</label>
          <textarea
            id="field-request"
            value={intake.request}
            placeholder="What finished thing do you need, and who will use it?"
            onChange={(event) => update("request", event.target.value)}
          />

          <div className="split">
            <div>
              <label htmlFor="field-function">Business area</label>
              <select
                id="field-function"
                value={intake.function}
                onChange={(event) => update("function", event.target.value as BusinessFunction)}
              >
                {(Object.keys(FUNCTION_LABELS) as BusinessFunction[]).map((key) => (
                  <option key={key} value={key}>
                    {FUNCTION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="field-audience">Reader</label>
              <input
                id="field-audience"
                value={intake.audience}
                placeholder="Who has to act"
                onChange={(event) => update("audience", event.target.value)}
              />
            </div>
          </div>

          <label htmlFor="field-outputHint">Finished piece</label>
          <input
            id="field-outputHint"
            value={intake.outputHint}
            placeholder="Email, one-page memo, table, checklist…"
            onChange={(event) => update("outputHint", event.target.value)}
          />

          <div className="facts">
            <h3>Facts that change the wording</h3>
            <label htmlFor="field-constraints">Limits</label>
            <textarea
              id="field-constraints"
              className="short"
              value={intake.constraints}
              placeholder="Length, claims you cannot make, tone, budget"
              onChange={(event) => update("constraints", event.target.value)}
            />
            <label htmlFor="field-success">Done when</label>
            <textarea
              id="field-success"
              className="short"
              value={intake.success}
              placeholder="What the reader can do after they read it"
              onChange={(event) => update("success", event.target.value)}
            />
            <label htmlFor="field-sources">Sources</label>
            <textarea
              id="field-sources"
              className="short"
              value={intake.sources}
              placeholder="The only materials the model may use"
              onChange={(event) => update("sources", event.target.value)}
            />
            <div className="split">
              <div>
                <label htmlFor="field-owner">Decision owner</label>
                <input
                  id="field-owner"
                  value={intake.owner}
                  placeholder="Who makes the call"
                  onChange={(event) => update("owner", event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="field-deadline">Deadline</label>
                <input
                  id="field-deadline"
                  value={intake.deadline}
                  placeholder="Date or horizon"
                  onChange={(event) => update("deadline", event.target.value)}
                />
              </div>
            </div>
            <label htmlFor="field-stakeholders">People affected</label>
            <input
              id="field-stakeholders"
              value={intake.stakeholders}
              placeholder="Names or roles"
              onChange={(event) => update("stakeholders", event.target.value)}
            />
            <label htmlFor="field-nonGoals">Out of scope</label>
            <textarea
              id="field-nonGoals"
              className="short"
              value={intake.nonGoals}
              placeholder="Work the model should refuse"
              onChange={(event) => update("nonGoals", event.target.value)}
            />
          </div>

          <div className="questions">
            <h3>Still worth asking</h3>
            {result.questions.length === 0 ? (
              <p className="quiet">Nothing else would change the structure. Add a fact above if you have one.</p>
            ) : (
              <ul>
                {result.questions.map((question) => (
                  <li key={question.id}>
                    <button type="button" onClick={() => focusField(question.field)}>
                      <span>{question.prompt}</span>
                      <small>
                        {question.priority === "required" ? "Needed" : "Useful"} — {question.why}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="starters">
            <h3>Start from a business job</h3>
            <div className="chips">
              {STARTERS.map((item) => (
                <button key={item.id} type="button" className="chip" onClick={() => applyStarter(item.intake)}>
                  <span>{item.label}</span>
                  <small>{item.scaleHint}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="sheet" aria-labelledby="prompt-heading">
          <div className="sheet-top">
            <div>
              <p className={`status status-${result.review.status}`}>{STATUS_LABEL[result.review.status]}</p>
              <h2 id="prompt-heading">{result.prompt.title}</h2>
              <p className="meter">
                {result.prompt.wordCount} words · {result.scale} budget {result.prompt.budgetMax}
              </p>
            </div>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => setSourceView((value) => !value)}>
                {sourceView ? "Brief view" : "Markdown"}
              </button>
              <button type="button" className="ghost" onClick={downloadPrompt}>
                Download
              </button>
              <button type="button" className="primary" onClick={copyPrompt}>
                {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy prompt"}
              </button>
            </div>
          </div>

          <div className="check" aria-live="polite">
            <h3>Agent check</h3>
            <ul>
              {result.review.findings.map((finding) => (
                <li key={finding.text} className={`finding finding-${finding.level}`}>
                  {finding.text}
                </li>
              ))}
            </ul>
            <ul className="notes">
              {result.prompt.efficiencyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          {sourceView ? (
            <pre className="source">{result.prompt.markdown}</pre>
          ) : (
            <article className="brief">
              <p className="preamble">{result.prompt.preamble}</p>
              {result.prompt.sections.map((section) => (
                <section key={section.id}>
                  <h3>{section.title}</h3>
                  <RichBody body={section.body} />
                </section>
              ))}
              {result.prompt.assumptions.length > 0 ? (
                <section>
                  <h3>Assumptions in force</h3>
                  <ul>
                    {result.prompt.assumptions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </article>
          )}

          <div className="omitted">
            <h3>Left out on a {result.scale} task</h3>
            <ul>
              {result.prompt.omitted.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}.</strong> {item.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
