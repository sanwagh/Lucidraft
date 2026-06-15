/**
 * Core LLM abstraction for Tandem.
 *
 * Every provider (Gemini, Ollama, OpenAI, …) implements the same tiny
 * `LLMProvider` interface. The rest of the app only ever depends on this
 * interface, so swapping providers is a matter of pointing the factory at a
 * different implementation (see `lib/llm/index.ts`).
 */

/** A single chat message in the provider-agnostic format. */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * The single method every provider must implement.
 *
 * `generate` takes the full message history (including the system message)
 * and returns the model's raw text response. Tandem then parses that text
 * into the structured `AssistantTurn` shape (see `lib/llm/parse.ts`).
 */
export interface LLMProvider {
  /** Human-readable name, used in error messages and logs. */
  readonly name: string;
  /** Produce a completion for the given conversation. */
  generate(messages: LLMMessage[]): Promise<string>;
}

/** Identifiers accepted by the `LLM_PROVIDER` env var / factory. */
export type ProviderId = "gemini" | "ollama" | "openai";
