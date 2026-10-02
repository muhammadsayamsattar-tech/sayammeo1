import type { Readiness } from "../types";
import { splitPrompt } from "../structurePrompt";
import { Mark } from "./Mark";

interface PromptPanelProps {
  markdown: string;
  readiness: Readiness[];
  dirty: boolean;
  view: "brief" | "markdown";
  copied: boolean;
  copyError: boolean;
  onView: (view: "brief" | "markdown") => void;
  onMarkdown: (value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
}

function Body({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).filter((block) => block.trim());
  return (
    <>
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={`${index}-${lines[0]}`}>
              {lines.map((line) => (
                <li key={line}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={`${index}-${block}`}>{block}</p>;
      })}
    </>
  );
}

export function PromptPanel({
  markdown,
  readiness,
  dirty,
  view,
  copied,
  copyError,
  onView,
  onMarkdown,
  onCopy,
  onDownload,
}: PromptPanelProps) {
  const parsed = markdown.trim() ? splitPrompt(markdown) : null;

  return (
    <section className="sheet sheet-prompt" id="prompt" aria-labelledby="prompt-heading" aria-live="polite">
      <div className="sheet-head">
        <div>
          <p className="index">02 — The agent</p>
          <h2 id="prompt-heading">Structured prompt</h2>
        </div>
        <div className="view-toggle" role="group" aria-label="Prompt view">
          <button type="button" aria-pressed={view === "brief"} className={view === "brief" ? "is-on" : undefined} onClick={() => onView("brief")}>
            Brief
          </button>
          <button
            type="button"
            aria-pressed={view === "markdown"}
            className={view === "markdown" ? "is-on" : undefined}
            onClick={() => onView("markdown")}
          >
            Markdown
          </button>
        </div>
      </div>

      {parsed ? (
        <>
          <div className="agent-line">
            <Mark />
            <p>
              <strong>Frame</strong>
              <span>{dirty ? "You edited this draft." : "Drafted from your notes, in this browser."}</span>
            </p>
          </div>
          {readiness.length > 0 ? (
            <ul className="ready">
              {readiness.map((item) => (
                <li key={item.id} className={item.present ? "is-on" : undefined}>
                  <span aria-hidden="true">{item.present ? "●" : "○"}</span>
                  {item.label}
                  <span className="sr">{item.present ? " found" : " missing"}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {view === "markdown" ? (
            <textarea
              className="markdown"
              aria-label="Structured prompt markdown"
              value={markdown}
              spellCheck
              onChange={(event) => onMarkdown(event.target.value)}
            />
          ) : (
            <article className="brief">
              <h3>{parsed.title}</h3>
              {parsed.intro ? <p className="intro">{parsed.intro}</p> : null}
              {parsed.sections.map((section) => (
                <section key={section.id}>
                  <h4>{section.heading}</h4>
                  <Body body={section.body} />
                </section>
              ))}
            </article>
          )}
          <div className="prompt-actions">
            <button type="button" className="primary" onClick={onCopy}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
            <button type="button" className="secondary" onClick={onDownload}>
              Download .md
            </button>
            {copyError ? <p>Clipboard was blocked. Select the markdown and copy it from there.</p> : null}
          </div>
        </>
      ) : (
        <div className="empty">
          <p className="empty-kicker">Waiting for a draft</p>
          <ol>
            <li>Describe the thing in whatever order it comes out.</li>
            <li>Choose what you are building, and who will read the prompt.</li>
            <li>Structure it. Frame keeps your facts and marks what is still missing.</li>
          </ol>
        </div>
      )}
    </section>
  );
}
