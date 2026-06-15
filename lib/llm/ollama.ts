/**
 * OllamaProvider — local models via Ollama's HTTP API.
 *
 * POSTs to `${OLLAMA_BASE_URL}/api/chat` (default base http://localhost:11434).
 * Model comes from `OLLAMA_MODEL` (default `qwen2.5:7b`). Ollama supports the
 * `system` role natively, so messages pass through almost unchanged.
 *
 * We pass `format: "json"` to nudge the model toward valid JSON, but smaller
 * local models are unreliable — the tolerant parser in `parse.ts` handles the
 * rest.
 */
import type { LLMMessage, LLMProvider } from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:7b";

interface OllamaChatResponse {
  message?: { role: string; content: string };
  error?: string;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages, // role/content already matches Ollama's schema
          stream: false,
          format: "json",
          options: { temperature: 0.4 },
        }),
      });
    } catch (err) {
      throw new Error(
        `Could not reach Ollama at ${this.baseUrl}. Is it running? (\`ollama serve\`) — ${
          (err as Error).message
        }`
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama request failed (${res.status}): ${body || res.statusText}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }
    const content = data.message?.content;
    if (!content) {
      throw new Error("Ollama returned an empty response.");
    }
    return content;
  }
}
