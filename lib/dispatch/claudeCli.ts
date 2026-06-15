/**
 * ClaudeCliDispatcher — hands the approved prompt directly to Claude Code by
 * shelling out to the `claude` CLI.
 *
 * ── Cost model ───────────────────────────────────────────────────────────────
 * The `claude` CLI uses whatever auth is active on the machine running Tandem.
 * If you're logged in with a Claude Pro/Max **subscription** (via `claude` /
 * `/login`) and DON'T have `ANTHROPIC_API_KEY` set, runs draw from your
 * subscription's included Claude Code usage — no extra per-token API bill
 * (subject to your plan's usage limits). If `ANTHROPIC_API_KEY` is set, the CLI
 * may use the pay-per-token API instead.
 *
 * ── How it runs ──────────────────────────────────────────────────────────────
 * A coding run can take minutes, so we do NOT block the HTTP request on it.
 * We spawn `claude -p "<prompt>"` detached, stream its stdout/stderr to a log
 * file in the queue dir, and return immediately with the job id + log path.
 * Tail the log to watch progress.
 *
 * Requirements:
 *  - The `claude` binary must be on the PATH of the process running `npm run dev`.
 *  - For Claude to actually edit files autonomously you usually need a permission
 *    flag (see TANDEM_CLAUDE_PERMISSION_MODE below) — print mode otherwise stops
 *    at the first tool that needs approval.
 */
import { spawn } from "node:child_process";
import { promises as fs, openSync } from "node:fs";
import path from "node:path";
import type { Dispatcher, DispatchOptions, DispatchResult } from "./types";

function makeId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export class ClaudeCliDispatcher implements Dispatcher {
  readonly name = "claude-cli";
  private readonly logDir: string;
  /** Default directory Claude Code runs in if the request doesn't specify one. */
  private readonly defaultCwd: string;
  /** Path to the claude binary (override if it's not on PATH). */
  private readonly bin: string;
  /** e.g. "acceptEdits" | "plan" | "bypassPermissions"; empty = CLI default. */
  private readonly permissionMode: string;

  constructor() {
    this.logDir = path.resolve(process.env.TANDEM_QUEUE_DIR || "./tandem-queue");
    this.defaultCwd = process.env.TANDEM_CLAUDE_CWD || process.cwd();
    this.bin = process.env.TANDEM_CLAUDE_BIN || "claude";
    this.permissionMode = process.env.TANDEM_CLAUDE_PERMISSION_MODE || "";
  }

  async dispatch(prompt: string, options?: DispatchOptions): Promise<DispatchResult> {
    const now = new Date();
    const id = makeId(now);
    const createdAt = now.toISOString();

    // Per-request cwd (from the UI) wins over the env default. Validate it so a
    // typo'd path surfaces a clear error in the UI instead of a cryptic spawn fail.
    const cwd = path.resolve(options?.cwd?.trim() || this.defaultCwd);
    try {
      const stat = await fs.stat(cwd);
      if (!stat.isDirectory()) {
        throw new Error(`Not a directory: ${cwd}`);
      }
    } catch (err) {
      throw new Error(
        `Working directory is not usable: ${cwd} — ${(err as Error).message}`
      );
    }

    await fs.mkdir(this.logDir, { recursive: true });
    const logPath = path.join(this.logDir, `${id}.log`);

    // Seed the log with metadata + the prompt, then append the CLI output.
    await fs.writeFile(
      logPath,
      `# Tandem dispatch ${id}\n# created-at: ${createdAt}\n# cwd: ${cwd}\n\n--- PROMPT ---\n${prompt}\n\n--- CLAUDE OUTPUT ---\n`,
      "utf8"
    );

    const args = ["-p", prompt];
    if (this.permissionMode) args.push("--permission-mode", this.permissionMode);

    // Open the log for appending and wire it to the child's stdout + stderr.
    const fd = openSync(logPath, "a");
    let child;
    try {
      child = spawn(this.bin, args, {
        cwd,
        detached: true,
        stdio: ["ignore", fd, fd],
      });
    } catch (err) {
      throw new Error(
        `Could not launch \`${this.bin}\`. Is the Claude Code CLI installed and on PATH? — ${
          (err as Error).message
        }`
      );
    }

    // Surface spawn errors (e.g. ENOENT) into the log rather than crashing.
    child.on("error", (err) => {
      void fs.appendFile(logPath, `\n[tandem] claude failed to start: ${err.message}\n`);
    });

    // Let the run outlive this request.
    child.unref();

    return {
      id,
      location: logPath,
      status: "queued",
      createdAt,
    };
  }
}
