/**
 * Conversation history, persisted in the browser via localStorage.
 *
 * We save the WHOLE conversation (not just the final prompt) so you can reopen
 * an old chat, see how you got there, and resume/revise it — the final prompt
 * is just the last assistant "ready" turn, so nothing is lost.
 *
 * This is a local, single-user store: it lives in the browser, survives reloads,
 * but is per-machine and cleared if you clear browser data. Cross-device history
 * would need a backend (intentionally out of scope for v1).
 */

/** A persisted chat message (mirrors the client's TranscriptMessage shape). */
export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set on assistant "ready" turns — the proposed prompt. */
  prompt?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: HistoryMessage[];
}

const KEY = "tandem.conversations";

/** Load all saved conversations (newest first). Never throws. */
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

/** Persist the full list. Never throws. */
export function saveConversations(list: Conversation[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or storage unavailable — drop silently.
  }
}

/** Derive a short sidebar title from the first user message. */
export function deriveTitle(messages: { role: string; content: string }[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const t = (firstUser?.content ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}
