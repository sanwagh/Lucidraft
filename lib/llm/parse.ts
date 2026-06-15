/**
 * Tolerant parser for the assistant's structured JSON output.
 *
 * The model is instructed to return:
 *   { "status": "needs_info" | "ready", "message": string, "prompt": string | null }
 *
 * ...but real models — especially smaller local ones via Ollama — frequently
 * wrap JSON in markdown fences, add stray prose, or emit slightly malformed
 * output. This parser is deliberately forgiving:
 *
 *   1. Strips markdown code fences (```json ... ```).
 *   2. Extracts the outermost {...} object if there's surrounding text.
 *   3. Validates the shape and normalizes it.
 *   4. Falls back to treating the raw text as a plain assistant message
 *      (status "needs_info") and logs a warning, so the UI never breaks.
 */

export type AssistantStatus = "needs_info" | "ready";

/** The normalized shape the rest of the app consumes. */
export interface AssistantTurn {
  status: AssistantStatus;
  message: string;
  prompt: string | null;
}

/**
 * Coerce a `message` field of unknown shape into clean display text.
 *
 * Smaller local models (e.g. llama3 8B) often ignore "message must be a string"
 * and instead emit the batched questions as an array — sometimes with stray
 * numbers interleaved, e.g. [1.36, "What colour?", 2.66, "Toggle back?"]. Or as
 * an object keyed by "1", "2", etc. We salvage the human-readable strings and
 * render them as a tidy numbered list, dropping the noise.
 */
function coerceMessage(value: unknown): string {
  if (typeof value === "string") return value.trim();

  let items: string[] = [];
  if (Array.isArray(value)) {
    items = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  } else if (value && typeof value === "object") {
    items = Object.values(value as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.trim() !== ""
    );
  }

  // Number each salvaged line, stripping any leading number the model baked in.
  return items
    .map((q, i) => `${i + 1}. ${q.trim().replace(/^\s*\d+[.)]\s*/, "")}`)
    .join("\n");
}

/** Remove a leading/trailing markdown code fence, if present. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  // Matches ```json\n...\n``` or ```\n...\n```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** Extract the outermost balanced { ... } block from a string. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parse raw model output into an `AssistantTurn`.
 * Never throws — on failure it returns a best-effort fallback.
 */
export function parseAssistantTurn(raw: string): AssistantTurn {
  const fallback = (): AssistantTurn => {
    console.warn(
      "[tandem] Could not parse structured JSON from model output. Falling back to raw text.\n--- raw ---\n" +
        raw +
        "\n-----------"
    );
    return {
      status: "needs_info",
      message: raw.trim() || "Sorry, I couldn't generate a response. Please try again.",
      prompt: null,
    };
  };

  if (!raw || !raw.trim()) return fallback();

  const candidate = extractJsonObject(stripCodeFences(raw)) ?? stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return fallback();
  }

  if (typeof parsed !== "object" || parsed === null) return fallback();

  const obj = parsed as Record<string, unknown>;

  // Normalize status; default to needs_info if it's missing/odd.
  const status: AssistantStatus = obj.status === "ready" ? "ready" : "needs_info";

  const coerced = coerceMessage(obj.message);
  const message = coerced
    ? coerced
    : status === "ready"
    ? "Here's the prompt I drafted — approve to dispatch it, or deny to revise."
    : raw.trim();

  const prompt =
    typeof obj.prompt === "string" && obj.prompt.trim() ? obj.prompt.trim() : null;

  // A "ready" turn with no usable prompt is incoherent — downgrade gracefully.
  if (status === "ready" && !prompt) {
    console.warn("[tandem] Model returned status 'ready' but no prompt; treating as needs_info.");
    return { status: "needs_info", message, prompt: null };
  }

  return { status, message, prompt };
}
