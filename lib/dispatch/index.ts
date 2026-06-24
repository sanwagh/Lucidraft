/**
 * Dispatcher factory.
 *
 * `getDispatcher()` is the single place that decides what "Approve" does with a
 * finished prompt, based on the `TANDEM_DISPATCHER` env var:
 *   - "file-queue" (default) → FileQueueDispatcher (records the prompt to a .md;
 *                              launches NOTHING — you copy/paste it yourself)
 *   - "claude-cli"           → ClaudeCliDispatcher  (opt-in: runs `claude -p`
 *                              headless ON THE SERVER; spawns a process)
 *
 * The interactive "terminal" dispatcher was removed: a web app's backend can
 * only open a terminal on the SERVER, never on the browser's machine, so it was
 * useless for remote/headless use. Approve → copy → paste is the default flow.
 *
 * Switching requires changing only that one variable — no other code edits.
 */
import type { Dispatcher } from "./types";
import { FileQueueDispatcher } from "./fileQueue";
import { ClaudeCliDispatcher } from "./claudeCli";

type DispatcherId = "file-queue" | "claude-cli";

const DEFAULT_DISPATCHER: DispatcherId = "file-queue";

export function getDispatcher(): Dispatcher {
  const id = (process.env.TANDEM_DISPATCHER || DEFAULT_DISPATCHER).toLowerCase() as DispatcherId;

  switch (id) {
    case "file-queue":
      return new FileQueueDispatcher();
    case "claude-cli":
      return new ClaudeCliDispatcher();
    default:
      throw new Error(
        `Unknown TANDEM_DISPATCHER "${id}". Expected one of: file-queue | claude-cli.`
      );
  }
}

export type { Dispatcher, DispatchResult } from "./types";
