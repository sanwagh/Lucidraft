/**
 * POST /api/chat
 *
 * Body: { messages: { role: "user" | "assistant"; content: string }[] }
 * Returns: AssistantTurn  -> { status, message, prompt }
 *
 * Prepends the system prompt, calls the active LLM provider, and parses the
 * model's output into the structured turn the frontend renders. All failure
 * modes (missing key, provider down, malformed JSON) resolve to a user-visible
 * message rather than an unhandled crash.
 */
import { NextResponse } from "next/server";
import { getProvider } from "@/lib/llm";
import type { LLMMessage } from "@/lib/llm/types";
import { SYSTEM_PROMPT } from "@/lib/llm/systemPrompt";
import { parseAssistantTurn } from "@/lib/llm/parse";

// The provider can use Node-only APIs (fetch is fine on edge too, but Gemini
// SDK expects Node), so pin this route to the Node.js runtime.
export const runtime = "nodejs";

interface ChatRequestBody {
  messages?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const history = body.messages;
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty `messages` array." },
      { status: 400 }
    );
  }

  // Collapse consecutive same-role turns into one. Some providers (notably
  // Gemini) expect roles to alternate; this can break after a "Deny" injects a
  // second assistant turn. Merging keeps every provider happy.
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of history) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
    } else {
      merged.push({ role: m.role, content: m.content });
    }
  }

  // Build the full message list: system prompt first, then the conversation.
  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...merged,
  ];

  // Set TANDEM_DEBUG=1 in .env.local to log the exact payload sent to the model
  // and its raw response to the `npm run dev` terminal.
  const debug =
    process.env.TANDEM_DEBUG === "1" || process.env.TANDEM_DEBUG === "true";

  try {
    const provider = getProvider();

    if (debug) {
      console.log(`\n[tandem:debug] ── Messages sent to ${provider.name} ──`);
      console.log(JSON.stringify(messages, null, 2));
    }

    const raw = await provider.generate(messages);

    if (debug) {
      console.log(`\n[tandem:debug] ── Raw response from ${provider.name} ──`);
      console.log(raw);
      console.log("[tandem:debug] ───────────────────────────────────────\n");
    }

    const turn = parseAssistantTurn(raw);
    return NextResponse.json(turn);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[tandem] /api/chat failed:", message);
    return NextResponse.json(
      { error: `Assistant request failed: ${message}` },
      { status: 502 }
    );
  }
}
