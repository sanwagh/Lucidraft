/**
 * GeminiProvider — Google Gemini via the official `@google/genai` SDK.
 *
 * Reads `GEMINI_API_KEY` (and optional `GEMINI_MODEL`). System messages are
 * mapped onto Gemini's `systemInstruction`; user/assistant turns become
 * `user`/`model` roles.
 */
import { GoogleGenAI } from "@google/genai";
import type { LLMMessage, LLMProvider } from "./types";

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to .env.local or switch LLM_PROVIDER."
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    // Gemini takes system guidance separately from the turn-by-turn contents.
    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        // Ask Gemini to emit JSON directly — keeps the parser's job easy.
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return text;
  }
}
