import type { Audience, BuildKind, Depth } from "./types";

const KEY = "frame.session.v1";

export interface SessionState {
  notes: string;
  projectName: string;
  kind: BuildKind;
  audience: Audience;
  depth: Depth;
  markdown: string;
}

const kinds: BuildKind[] = ["web", "mobile", "api", "cli", "agent", "site"];
const audiences: Audience[] = ["coding", "product", "design"];
const depths: Depth[] = ["lean", "standard", "detailed"];

export const emptySession: SessionState = {
  notes: "",
  projectName: "",
  kind: "web",
  audience: "coding",
  depth: "standard",
  markdown: "",
};

function isEnum<T extends string>(value: unknown, options: T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

export function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySession;
    const data = JSON.parse(raw) as Partial<SessionState>;
    if (typeof data.notes !== "string") return emptySession;
    return {
      notes: data.notes,
      projectName: typeof data.projectName === "string" ? data.projectName : "",
      kind: isEnum(data.kind, kinds) ? data.kind : "web",
      audience: isEnum(data.audience, audiences) ? data.audience : "coding",
      depth: isEnum(data.depth, depths) ? data.depth : "standard",
      markdown: typeof data.markdown === "string" ? data.markdown : "",
    };
  } catch {
    return emptySession;
  }
}

export function saveSession(state: SessionState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
