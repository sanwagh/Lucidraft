/**
 * OpenAIProvider — optional/stub implementation.
 *
 * Reads `OPENAI_API_KEY` (and optional `OPENAI_MODEL`). This is a fully working
 * skeleton built on the Chat Completions REST API via `fetch`, so it needs no
 * extra SDK dependency. It's wired into the factory and ready to use if you set
 * `LLM_PROVIDER=openai`, but it's not the default path.
 */
import type { LLMMessage, LLMProvider } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local or switch LLM_PROVIDER."
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages, // OpenAI uses the same {role, content} shape we already have
        temperature: 0.4,
        // Ask for a JSON object to keep parsing reliable.
        response_format: { type: "json_object" },
      }),
    });

    const data = (await res.json()) as OpenAIChatResponse;
    if (!res.ok || data.error) {
      throw new Error(`OpenAI error: ${data.error?.message || res.statusText}`);
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }
    return content;
  }
}
