/**
 * Dispatch abstraction for Tandem.
 *
 * Once a prompt is approved, it must be handed off to "Claude Code". How that
 * handoff happens is hidden behind the `Dispatcher` interface. v1 ships a
 * `FileQueueDispatcher` that writes the prompt to a queue directory; a future
 * `ClaudeCliDispatcher` could shell out to the `claude` CLI instead — without
 * any other part of the app changing.
 */

/** Result of a successful dispatch, surfaced back to the UI. */
export interface DispatchResult {
  /** Unique id of the queued job (also the filename stem). */
  id: string;
  /** Where the job landed (file path, queue id, etc.). */
  location: string;
  /** Lifecycle status of the job at dispatch time. */
  status: "queued";
  /** ISO timestamp the job was created. */
  createdAt: string;
}

/** Per-dispatch options supplied at approval time (e.g. from the UI). */
export interface DispatchOptions {
  /** Working directory for the run (claude-cli only). Overrides env defaults. */
  cwd?: string;
}

/** The single method every dispatcher must implement. */
export interface Dispatcher {
  /** Human-readable name, used in logs / responses. */
  readonly name: string;
  /** Hand the approved prompt off for execution. */
  dispatch(prompt: string, options?: DispatchOptions): Promise<DispatchResult>;
}
