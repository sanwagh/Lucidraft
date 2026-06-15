/**
 * TerminalDispatcher — opens an INTERACTIVE Claude Code session in a terminal,
 * seeded with the approved prompt, so you approve/reject changes live (the
 * normal Claude Code experience) while staying one click from the Tandem UI.
 * Uses your `claude` CLI login (your subscription) — no API key required.
 *
 * Cross-platform. For each OS we write the prompt to a file (so we never have to
 * shell-quote the prompt itself) and launch a terminal that `cd`s into your
 * chosen folder and runs `claude` with that prompt:
 *   - macOS   → executable `.command` opened in Terminal.app via `open`
 *   - Windows → `.ps1` opened in a new PowerShell window via `start`
 *   - Linux   → `.sh` run in the first available terminal emulator
 *
 * NOTE: macOS is the tested path. Windows/Linux are written to the same shape
 * but unverified here — if a window doesn't open, the launcher script is still
 * written to the queue dir so you can run it manually.
 */
import { spawn, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dispatcher, DispatchOptions, DispatchResult } from "./types";

function makeId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

/** Wrap a string as a safe bash single-quoted literal. */
function bashQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Wrap a string as a safe PowerShell single-quoted literal. */
function psQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Linux terminal emulators to try, in order. */
const LINUX_TERMINALS = [
  "x-terminal-emulator",
  "gnome-terminal",
  "konsole",
  "xfce4-terminal",
  "xterm",
];

export class TerminalDispatcher implements Dispatcher {
  readonly name = "terminal";
  private readonly queueDir: string;
  /** Default directory if the request doesn't specify one. */
  private readonly defaultCwd: string;
  /** Path to the claude binary (override if it's not on PATH). */
  private readonly bin: string;

  constructor() {
    this.queueDir = path.resolve(process.env.TANDEM_QUEUE_DIR || "./tandem-queue");
    this.defaultCwd = process.env.TANDEM_CLAUDE_CWD || process.cwd();
    this.bin = process.env.TANDEM_CLAUDE_BIN || "claude";
  }

  async dispatch(prompt: string, options?: DispatchOptions): Promise<DispatchResult> {
    const now = new Date();
    const id = makeId(now);
    const createdAt = now.toISOString();

    // Per-request cwd (from the UI) wins over the env default. Validate it.
    const cwd = path.resolve(options?.cwd?.trim() || this.defaultCwd);
    try {
      const stat = await fs.stat(cwd);
      if (!stat.isDirectory()) throw new Error(`Not a directory: ${cwd}`);
    } catch (err) {
      throw new Error(
        `Working directory is not usable: ${cwd} — ${(err as Error).message}`
      );
    }

    await fs.mkdir(this.queueDir, { recursive: true });

    // Write the prompt to a file so prompt contents never need shell-quoting.
    const promptPath = path.join(this.queueDir, `${id}.prompt.txt`);
    await fs.writeFile(promptPath, prompt, "utf8");

    let location: string;
    switch (process.platform) {
      case "darwin":
        location = await this.launchMac(id, cwd, promptPath);
        break;
      case "win32":
        location = await this.launchWindows(id, cwd, promptPath);
        break;
      default:
        location = await this.launchLinux(id, cwd, promptPath);
        break;
    }

    return { id, location, status: "queued", createdAt };
  }

  /** macOS: executable .command opened in Terminal.app (the default handler). */
  private async launchMac(id: string, cwd: string, promptPath: string): Promise<string> {
    const commandPath = path.join(this.queueDir, `${id}.command`);
    const script = `#!/bin/bash
cd ${bashQuote(cwd)} || exit 1
${bashQuote(this.bin)} "$(cat ${bashQuote(promptPath)})"
`;
    await fs.writeFile(commandPath, script, "utf8");
    await fs.chmod(commandPath, 0o755);
    this.spawnDetached("open", [commandPath]);
    return commandPath;
  }

  /** Windows: PowerShell script opened in a new window via `start`. */
  private async launchWindows(id: string, cwd: string, promptPath: string): Promise<string> {
    const ps1Path = path.join(this.queueDir, `${id}.ps1`);
    const script = `Set-Location -LiteralPath ${psQuote(cwd)}
$prompt = Get-Content -Raw -LiteralPath ${psQuote(promptPath)}
& ${psQuote(this.bin)} $prompt
`;
    await fs.writeFile(ps1Path, script, "utf8");
    // `start "" powershell ...` opens a fresh console window; -NoExit keeps it.
    this.spawnDetached(
      `start "" powershell -NoExit -ExecutionPolicy Bypass -File "${ps1Path}"`,
      [],
      { shell: true }
    );
    return ps1Path;
  }

  /** Linux: a .sh run in the first available terminal emulator. */
  private async launchLinux(id: string, cwd: string, promptPath: string): Promise<string> {
    const shPath = path.join(this.queueDir, `${id}.sh`);
    const script = `#!/bin/bash
cd ${bashQuote(cwd)} || exit 1
${bashQuote(this.bin)} "$(cat ${bashQuote(promptPath)})"
exec bash
`;
    await fs.writeFile(shPath, script, "utf8");
    await fs.chmod(shPath, 0o755);

    const term =
      process.env.TANDEM_TERMINAL || LINUX_TERMINALS.find((t) => this.onPath(t));
    if (!term) {
      throw new Error(
        `No terminal emulator found. Set TANDEM_TERMINAL to one, or run the script yourself: bash ${shPath}`
      );
    }
    // gnome-terminal uses `-- <cmd>`; most others use `-e <cmd...>`.
    const args = term.includes("gnome-terminal")
      ? ["--", "bash", shPath]
      : ["-e", "bash", shPath];
    this.spawnDetached(term, args);
    return shPath;
  }

  /** Is a command available on PATH? */
  private onPath(cmd: string): boolean {
    try {
      execFileSync("which", [cmd], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  /** Fire-and-forget launch; failures surface as the run simply not opening. */
  private spawnDetached(command: string, args: string[], opts: { shell?: boolean } = {}): void {
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
        shell: opts.shell,
      });
      child.on("error", () => {});
      child.unref();
    } catch {
      // The launcher script is already on disk for manual fallback.
    }
  }
}
