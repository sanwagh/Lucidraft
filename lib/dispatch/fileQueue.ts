/**
 * FileQueueDispatcher — writes approved prompts to a queue directory on disk.
 *
 * Each approved prompt becomes a timestamped markdown file in the queue dir
 * (default `./tandem-queue`, override with `TANDEM_QUEUE_DIR`). The file holds
 * YAML-ish front-matter metadata (id, created-at, status) followed by the
 * prompt body. An external watcher can tail this directory, run each prompt
 * through `claude`, and flip the status.
 *
 * ── A sibling dispatcher: ClaudeCliDispatcher ────────────────────────────────
 * The whole point of the `Dispatcher` interface is that this file is the only
 * thing that knows about "files". `ClaudeCliDispatcher` (see `claudeCli.ts`)
 * implements the same interface but shells out to `claude -p` instead of
 * writing to disk. `getDispatcher()` in `index.ts` picks between them off the
 * `TANDEM_DISPATCHER` env var — the API route and UI stay untouched either way.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dispatcher, DispatchOptions, DispatchResult } from "./types";

/** Build a sortable, filesystem-safe id from the current time. */
function makeId(date: Date): string {
  // e.g. 2026-06-14T09-31-07-512Z  (colons/dots are illegal on some FS)
  return date.toISOString().replace(/[:.]/g, "-");
}

export class FileQueueDispatcher implements Dispatcher {
  readonly name = "file-queue";
  private readonly queueDir: string;

  constructor(queueDir?: string) {
    this.queueDir = path.resolve(
      queueDir || process.env.TANDEM_QUEUE_DIR || "./tandem-queue"
    );
  }

  // The file queue has no notion of a working directory, so `options` is ignored.
  async dispatch(prompt: string, _options?: DispatchOptions): Promise<DispatchResult> {
    const now = new Date();
    const id = makeId(now);
    const createdAt = now.toISOString();

    // Ensure the queue directory exists.
    await fs.mkdir(this.queueDir, { recursive: true });

    const filePath = path.join(this.queueDir, `${id}.md`);

    // Markdown file: front-matter metadata + the prompt body.
    const contents = `---
id: ${id}
created-at: ${createdAt}
status: queued
---

${prompt}
`;

    await fs.writeFile(filePath, contents, "utf8");

    return {
      id,
      location: filePath,
      status: "queued",
      createdAt,
    };
  }
}
