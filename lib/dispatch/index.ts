/**
 * Dispatcher factory.
 *
 * `getDispatcher()` is the single place that decides how approved prompts are
 * handed off, based solely on the `TANDEM_DISPATCHER` env var:
 *   - "file-queue" (default) → FileQueueDispatcher (writes a .md file)
 *   - "claude-cli"           → ClaudeCliDispatcher  (runs `claude -p` headless)
 *   - "terminal"             → TerminalDispatcher   (opens interactive claude)
 *
 * Switching requires changing only that one variable — no other code edits.
 */
import type { Dispatcher } from "./types";
import { FileQueueDispatcher } from "./fileQueue";
import { ClaudeCliDispatcher } from "./claudeCli";
import { TerminalDispatcher } from "./terminal";

type DispatcherId = "file-queue" | "claude-cli" | "terminal";

const DEFAULT_DISPATCHER: DispatcherId = "file-queue";

export function getDispatcher(): Dispatcher {
  const id = (process.env.TANDEM_DISPATCHER || DEFAULT_DISPATCHER).toLowerCase() as DispatcherId;

  switch (id) {
    case "file-queue":
      return new FileQueueDispatcher();
    case "claude-cli":
      return new ClaudeCliDispatcher();
    case "terminal":
      return new TerminalDispatcher();
    default:
      throw new Error(
        `Unknown TANDEM_DISPATCHER "${id}". Expected one of: file-queue | claude-cli | terminal.`
      );
  }
}

export type { Dispatcher, DispatchResult } from "./types";
