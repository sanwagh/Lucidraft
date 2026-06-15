# Tandem

A prompt-engineering assistant that turns vague ideas into well-structured,
ready-to-run prompts for **Claude Code**.

You describe what you want in a chat interface. Tandem asks any missing
requirements as a single batched set of questions, drafts a polished final
prompt, and shows it to you in a **Proposed Prompt** card with **Approve** /
**Deny** buttons. On approval, the prompt is dispatched to a file queue that a
watcher (or a future Claude CLI dispatcher) can consume. On denial, Tandem asks
what to change, revises, and presents a new draft — looping until you approve.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
#    then edit .env.local — at minimum set GEMINI_API_KEY (default provider)

# 3. Run the dev server
npm run dev
#    open http://localhost:3000
```

> Requires Node.js 18.17+ (Next.js 14).

---

## Switching the LLM provider

Tandem talks to an LLM through a single `LLMProvider` interface
(`generate(messages): Promise<string>`). The active provider is chosen by **one
env var**, `LLM_PROVIDER`, resolved in one factory (`getProvider()` in
`lib/llm/index.ts`). **Switching providers requires changing only that
variable** — no code edits.

| `LLM_PROVIDER` | Implementation     | Required env vars                              |
| -------------- | ------------------ | --------------------------------------------- |
| `gemini` (default) | `GeminiProvider`   | `GEMINI_API_KEY` (opt: `GEMINI_MODEL`)        |
| `ollama`       | `OllamaProvider`   | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`             |
| `openai`       | `OpenAIProvider`   | `OPENAI_API_KEY` (opt: `OPENAI_MODEL`)        |

Examples:

```bash
# Google Gemini (default) — get a key at https://aistudio.google.com/apikey
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key

# Local Ollama — first run: ollama serve && ollama pull qwen2.5:7b
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# OpenAI (optional skeleton)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
```

After changing `.env.local`, restart `npm run dev`.

> **Note on local models:** smaller Ollama models emit less reliable JSON.
> Tandem's parser (`lib/llm/parse.ts`) strips code fences, extracts the JSON
> object from surrounding prose, and falls back to showing raw text — so the UI
> never breaks, but larger models give cleaner results.

---

## Dispatch: where approved prompts go

On **Approve**, the backend (`POST /api/dispatch`) calls the active `Dispatcher`,
chosen by the `TANDEM_DISPATCHER` env var:

| `TANDEM_DISPATCHER` | What happens | Cost |
| ------------------- | ------------ | ---- |
| `file-queue` (default) | Writes a timestamped `.md` file to the queue dir; a watcher consumes it | Free |
| `terminal`          | Opens an **interactive** Claude Code session in Terminal.app, seeded with the prompt — you approve/reject changes live | Uses your Claude subscription login (no per-token API charge) **if** `ANTHROPIC_API_KEY` is not set |
| `claude-cli`        | Runs `claude -p "<prompt>"` **headless** (auto-accept), output to a log — no interactive approval | Same as terminal re: subscription/API |

### `terminal` — interactive Claude Code (recommended for hands-on use)

Set `TANDEM_DISPATCHER=terminal`. On Approve, Tandem writes the prompt to a file,
generates a small launcher script that `cd`s into your folder and runs `claude`
with the prompt, and opens it in a terminal so you get a **normal interactive
Claude Code session** — approve/reject every permission and edit in that window.
Pick the project folder in the UI (the "Project directory" field on the prompt
card). Cross-platform:

| OS | How it opens | Launcher written to queue dir |
| -- | ------------ | ----------------------------- |
| macOS | `open` → Terminal.app | `<id>.command` |
| Windows | `start` → new PowerShell window | `<id>.ps1` |
| Linux | first available emulator (`gnome-terminal`, `konsole`, `xterm`, … or `TANDEM_TERMINAL`) | `<id>.sh` |

If a window doesn't auto-open, the launcher script is still written to the queue
dir — run it manually. macOS is the tested path; Windows/Linux are unverified.
On all three, give the **absolute** project path (macOS/Linux: `/Users/you/...`;
Windows: `C:\Users\you\...`).

### `claude-cli` — send straight to Claude Code

Set `TANDEM_DISPATCHER=claude-cli`. On approval Tandem spawns the `claude` CLI
detached and streams its output to `./tandem-queue/<id>.log` (so a long coding
run doesn't block the request — `tail -f` the log to watch). Requirements:

- The `claude` binary must be on the PATH of the process running `npm run dev`
  (override with `TANDEM_CLAUDE_BIN`).
- For autonomous file edits in headless print mode, set a permission mode, e.g.
  `TANDEM_CLAUDE_PERMISSION_MODE=acceptEdits` — otherwise Claude pauses at the
  first action needing approval. (`bypassPermissions` skips all prompts; use with
  care.)
- **Working directory:** set it per-project right in the UI — when the
  `claude-cli` dispatcher is active, the Proposed Prompt card shows a "Project
  directory" field that's remembered across reloads (localStorage) and sent with
  each Approve. `TANDEM_CLAUDE_CWD` is just the fallback default when the field
  is left blank (defaults to the server's CWD). The path is validated before the
  run, so a typo shows an error instead of failing silently.
- **Cost:** the CLI uses whatever auth is active. Logged in via a Pro/Max
  subscription with no `ANTHROPIC_API_KEY` set → draws from your subscription's
  Claude Code usage, no separate bill (subject to plan limits). With an API key
  set → pay-per-token.

### `file-queue` — the default

`FileQueueDispatcher` writes the approved prompt to a timestamped markdown file
in the queue directory (default `./tandem-queue`, override with
`TANDEM_QUEUE_DIR`). Each file looks like:

```markdown
---
id: 2026-06-14T09-31-07-512Z
created-at: 2026-06-14T09:31:07.512Z
status: queued
---

<the approved prompt for Claude Code>
```

The UI then confirms with the file path and queue id. That's the whole contract:
**one markdown file per approved prompt, newest sorts last by filename.**

### Wiring up a watcher

A watcher just needs to notice new `.md` files in the queue dir, run each
through the `claude` CLI, and mark it done (e.g. move it to a `done/` subdir or
flip `status:`). A minimal shell watcher:

```bash
mkdir -p tandem-queue/done
while true; do
  for f in tandem-queue/*.md; do
    [ -e "$f" ] || continue
    echo "Running $f"
    claude -p "$(sed '1,/^---$/d; 1,/^---$/d' "$f")"   # strip front-matter, run body
    mv "$f" tandem-queue/done/
  done
  sleep 2
done
```

(Use `fswatch`/`chokidar`/`inotifywait` for event-driven instead of polling.)

---

## Extending Tandem

### Add a new LLM provider
1. Create `lib/llm/<provider>.ts` implementing the `LLMProvider` interface
   (`lib/llm/types.ts`).
2. Add a `case` for it in `getProvider()` (`lib/llm/index.ts`).
3. Document its env vars in `.env.local.example` and the table above.

### Swap in the future Claude CLI dispatcher
The `Dispatcher` interface (`lib/dispatch/types.ts`) hides *how* prompts are
handed off. A `ClaudeCliDispatcher` that shells out to `claude` can replace the
file queue without touching the API route or UI — see the worked sketch and the
`getDispatcher()` factory in `lib/dispatch/fileQueue.ts` and
`lib/dispatch/index.ts`.

---

## Project structure

```
app/
  layout.tsx                 root layout
  page.tsx                   renders the Chat
  globals.css                Tailwind + base styles
  api/
    chat/route.ts            POST /api/chat — system prompt + LLM + JSON parse
    dispatch/route.ts        POST /api/dispatch — write to the queue
lib/
  llm/
    types.ts                 LLMProvider interface (the key abstraction)
    systemPrompt.ts          editable assistant system prompt + JSON contract
    parse.ts                 tolerant structured-JSON parser
    gemini.ts | ollama.ts | openai.ts   provider implementations
    index.ts                 getProvider() factory (single LLM_PROVIDER switch)
  dispatch/
    types.ts                 Dispatcher interface (the key abstraction)
    fileQueue.ts             FileQueueDispatcher (+ ClaudeCliDispatcher sketch)
    index.ts                 getDispatcher() factory
  clientTypes.ts             shared client-side types
components/
  Chat.tsx                   stateful orchestrator
  MessageBubble.tsx          user/assistant bubbles
  ProposedPrompt.tsx         the Approve/Deny prompt card
  ChatInput.tsx              auto-growing composer
```

---

## The assistant contract

Every turn, the model must return a single JSON object:

```json
{ "status": "needs_info" | "ready", "message": "string", "prompt": "string | null" }
```

- `needs_info` → `message` is shown as a normal assistant bubble (holds the
  batched numbered questions).
- `ready` → `message` is a short intro line **and** `prompt` is rendered in the
  Proposed Prompt card with Approve / Deny.

The system prompt enforcing this lives in `lib/llm/systemPrompt.ts` and is the
one place to edit the assistant's behavior.
