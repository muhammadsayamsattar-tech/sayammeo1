import { useEffect, useState } from "react";
import { examples } from "../examples";
import type { Audience, BuildKind, Depth } from "../types";
import { Segmented } from "./Segmented";

interface NotesPanelProps {
  notes: string;
  projectName: string;
  kind: BuildKind;
  audience: Audience;
  depth: Depth;
  canStructure: boolean;
  stale: boolean;
  dirty: boolean;
  hasResult: boolean;
  onNotes: (value: string) => void;
  onProjectName: (value: string) => void;
  onKind: (value: BuildKind) => void;
  onAudience: (value: Audience) => void;
  onDepth: (value: Depth) => void;
  onStructure: () => void;
  onExample: (id: string) => void;
  onClear: () => void;
}

export function NotesPanel({
  notes,
  projectName,
  kind,
  audience,
  depth,
  canStructure,
  stale,
  dirty,
  hasResult,
  onNotes,
  onProjectName,
  onKind,
  onAudience,
  onDepth,
  onStructure,
  onExample,
  onClear,
}: NotesPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!notes.trim() && !projectName.trim()) setConfirming(false);
  }, [notes, projectName]);

  const action = !hasResult ? "Structure this" : stale || dirty ? "Update the prompt" : "Structure again";

  return (
    <section className="sheet sheet-notes" aria-labelledby="notes-heading">
      <div className="sheet-head">
        <div>
          <p className="index">01 — Your words</p>
          <h2 id="notes-heading">Unstructured notes</h2>
        </div>
        {confirming ? (
          <div className="confirm">
            <span>Clear this draft?</span>
            <button type="button" onClick={onClear}>
              Clear
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={() => setConfirming(true)}>
            Clear
          </button>
        )}
      </div>

      <label className="name-field" htmlFor="project-name">
        <span>Working title</span>
        <input
          id="project-name"
          value={projectName}
          placeholder="Optional"
          onChange={(event) => onProjectName(event.target.value)}
        />
      </label>

      <label className="notes-label" htmlFor="notes">
        What do you want to build?
      </label>
      <textarea
        id="notes"
        value={notes}
        spellCheck
        placeholder="A weekend idea, a voice note, a pile of fragments. Say who it's for, what it should do, and what you want left out."
        onChange={(event) => onNotes(event.target.value)}
      />
      <p className="meta-row">
        <span>{words === 1 ? "1 word" : `${words} words`}</span>
        <span>Fragments are enough</span>
      </p>

      <div className="examples">
        <p>Try a rough idea</p>
        <div>
          {examples.map((example) => (
            <button key={example.id} type="button" onClick={() => onExample(example.id)}>
              <strong>{example.label}</strong>
              <span>{example.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="controls">
        <Segmented
          label="Building"
          value={kind}
          onChange={onKind}
          options={[
            { value: "web", label: "Web" },
            { value: "mobile", label: "Mobile" },
            { value: "api", label: "API" },
            { value: "cli", label: "CLI" },
            { value: "agent", label: "Agent" },
            { value: "site", label: "Site" },
          ]}
        />
        <Segmented
          label="This prompt is for"
          value={audience}
          onChange={onAudience}
          options={[
            { value: "coding", label: "Coding agent" },
            { value: "product", label: "Product brief" },
            { value: "design", label: "Design brief" },
          ]}
        />
        <Segmented
          label="Detail"
          value={depth}
          onChange={onDepth}
          options={[
            { value: "lean", label: "Lean" },
            { value: "standard", label: "Standard" },
            { value: "detailed", label: "Thorough" },
          ]}
        />
      </div>

      <div className="action-row">
        <button type="button" className="primary" disabled={!canStructure} onClick={onStructure}>
          {action}
        </button>
        <p>{canStructure ? "Ctrl + Enter" : "Add a little more about what you want to build."}</p>
      </div>
    </section>
  );
}
