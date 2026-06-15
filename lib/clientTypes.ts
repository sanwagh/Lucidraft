/**
 * Shared types used by the React client.
 *
 * Kept separate from server-only modules (which import `node:fs`, SDKs, etc.)
 * so client components can import types without pulling in server code.
 */

/** A message rendered in the chat transcript. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** The structured turn returned by /api/chat (mirrors AssistantTurn). */
export interface AssistantTurnDTO {
  status: "needs_info" | "ready";
  message: string;
  prompt: string | null;
}

/** The result returned by /api/dispatch (mirrors DispatchResult). */
export interface DispatchResultDTO {
  id: string;
  location: string;
  status: "queued";
  createdAt: string;
}
