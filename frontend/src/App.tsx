import { useEffect, useMemo, useState } from "react";
import { Mark } from "./components/Mark";
import { NotesPanel } from "./components/NotesPanel";
import { PromptPanel } from "./components/PromptPanel";
import { examples } from "./examples";
import { clearSession, loadSession, saveSession } from "./session";
import { promptFilename, structurePrompt } from "./structurePrompt";
import type { Audience, BuildKind, Depth, Readiness } from "./types";

function signatureOf(input: {
  notes: string;
  projectName: string;
  kind: BuildKind;
  audience: Audience;
  depth: Depth;
}): string {
  return JSON.stringify(input);
}

function restoredDraft(stored: ReturnType<typeof loadSession>) {
  if (stored.notes.trim().length < 12) {
    return { readiness: [] as Readiness[], signed: "", dirty: false };
  }
  const result = structurePrompt(stored);
  return {
    readiness: result.readiness,
    signed: signatureOf(stored),
    dirty: stored.markdown.trim().length > 0 && stored.markdown !== result.markdown,
  };
}

export default function App() {
  const stored = useMemo(() => loadSession(), []);
  const restored = useMemo(() => restoredDraft(stored), [stored]);
  const [notes, setNotes] = useState(stored.notes);
  const [projectName, setProjectName] = useState(stored.projectName);
  const [kind, setKind] = useState<BuildKind>(stored.kind);
  const [audience, setAudience] = useState<Audience>(stored.audience);
  const [depth, setDepth] = useState<Depth>(stored.depth);
  const [markdown, setMarkdown] = useState(stored.markdown);
  const [readiness, setReadiness] = useState<Readiness[]>(restored.readiness);
  const [signed, setSigned] = useState(restored.signed);
  const [dirty, setDirty] = useState(restored.dirty);
  const [view, setView] = useState<"brief" | "markdown">("brief");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    saveSession({ notes, projectName, kind, audience, depth, markdown });
  }, [notes, projectName, kind, audience, depth, markdown]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        structure();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const signature = signatureOf({ notes, projectName, kind, audience, depth });
  const canStructure = notes.trim().length >= 12;
  const stale = Boolean(markdown) && signed !== "" && signed !== signature;

  function structure(overrides?: {
    notes?: string;
    projectName?: string;
    kind?: BuildKind;
    audience?: Audience;
    depth?: Depth;
  }) {
    const draft = {
      notes: overrides?.notes ?? notes,
      projectName: overrides?.projectName ?? projectName,
      kind: overrides?.kind ?? kind,
      audience: overrides?.audience ?? audience,
      depth: overrides?.depth ?? depth,
    };
    if (draft.notes.trim().length < 12) return;
    const result = structurePrompt(draft);
    setMarkdown(result.markdown);
    setReadiness(result.readiness);
    setSigned(signatureOf(draft));
    setDirty(false);
    setCopied(false);
    setCopyError(false);
    setView("brief");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("prompt")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }

  function applyExample(id: string) {
    const example = examples.find((item) => item.id === id);
    if (!example) return;
    setNotes(example.notes);
    setProjectName(example.projectName ?? "");
    setKind(example.kind);
    setAudience(example.audience);
    setDepth(example.depth);
    structure({
      notes: example.notes,
      projectName: example.projectName ?? "",
      kind: example.kind,
      audience: example.audience,
      depth: example.depth,
    });
  }

  function clear() {
    setNotes("");
    setProjectName("");
    setKind("web");
    setAudience("coding");
    setDepth("standard");
    setMarkdown("");
    setReadiness([]);
    setSigned("");
    setDirty(false);
    setCopied(false);
    setCopyError(false);
    clearSession();
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setView("markdown");
      setCopyError(true);
    }
  }

  function downloadPrompt() {
    const title = markdown.match(/^#\s+(?:Build prompt|Product brief|Design brief):\s*(.+)$/m)?.[1] ?? "prompt";
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = promptFilename(title);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#notes">
          <Mark />
          <span>
            <strong>Frame</strong>
            <em>Rough notes in. A build prompt out.</em>
          </span>
        </a>
        <p>An agent that structures what you want to build before anyone writes code.</p>
      </header>
      <main>
        <NotesPanel
          notes={notes}
          projectName={projectName}
          kind={kind}
          audience={audience}
          depth={depth}
          canStructure={canStructure}
          stale={stale}
          dirty={dirty}
          hasResult={Boolean(markdown.trim())}
          onNotes={setNotes}
          onProjectName={setProjectName}
          onKind={setKind}
          onAudience={setAudience}
          onDepth={setDepth}
          onStructure={() => structure()}
          onExample={applyExample}
          onClear={clear}
        />
        <PromptPanel
          markdown={markdown}
          readiness={readiness}
          dirty={dirty}
          view={view}
          copied={copied}
          copyError={copyError}
          onView={setView}
          onMarkdown={(value) => {
            setMarkdown(value);
            setDirty(true);
            setCopied(false);
          }}
          onCopy={() => void copyPrompt()}
          onDownload={downloadPrompt}
        />
      </main>
      <footer>
        <p>Notes stay in this browser. Frame drafts the prompt on your device, and keeps the same shape for a model later.</p>
      </footer>
    </div>
  );
}
