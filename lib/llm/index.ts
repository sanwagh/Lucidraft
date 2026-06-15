/**
 * Provider factory.
 *
 * `getProvider()` is the SINGLE place that decides which LLM backend is active,
 * based solely on the `LLM_PROVIDER` env var. Switching providers means changing
 * that one variable — nothing else in the app references a concrete provider.
 *
 * To add a new provider:
 *   1. Implement `LLMProvider` in a new file under `lib/llm/`.
 *   2. Add a case to the switch below.
 *   3. Document its env vars in `.env.local.example` and the README.
 */
import type { LLMProvider, ProviderId } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";

const DEFAULT_PROVIDER: ProviderId = "gemini";

export function getProvider(): LLMProvider {
  const id = (process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase() as ProviderId;

  switch (id) {
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    case "openai":
      return new OpenAIProvider();
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${id}". Expected one of: gemini | ollama | openai.`
      );
  }
}

export type { LLMProvider, LLMMessage, ProviderId } from "./types";
