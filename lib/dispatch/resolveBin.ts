/**
 * Locating the `claude` CLI from a server process.
 *
 * The trap: `npm run dev` inherits your interactive shell's PATH, so `claude`
 * (typically installed at ~/.local/bin) is found. The BUILT app — `next start`
 * under systemd / pm2 / a bare service — runs with a minimal PATH that usually
 * omits ~/.local/bin, so `spawn("claude")` throws ENOENT and the dispatch
 * silently does nothing. We fix that by resolving an ABSOLUTE path up front
 * (override → PATH → common install locations) and by handing spawned children
 * an augmented PATH so Claude can still find `node`, `git`, etc.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

/** Common dirs CLIs install into that a minimal service PATH tends to miss. */
function commonBinDirs(): string[] {
  const home = os.homedir();
  if (process.platform === "win32") {
    return [
      path.join(home, "AppData", "Roaming", "npm"),
      path.join(home, ".local", "bin"),
    ];
  }
  return [
    path.join(home, ".local", "bin"),
    path.join(home, ".claude", "local"),
    path.join(home, ".npm-global", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
  ];
}

/**
 * Resolve an absolute path to the Claude Code CLI, or throw a clear, actionable
 * error. `override` is TANDEM_CLAUDE_BIN (a full path or a command name).
 */
export function resolveClaudeBin(override?: string): string {
  const isWin = process.platform === "win32";
  const name = (override && override.trim()) || "claude";

  // 1. Explicit absolute override — trust it, but verify it exists.
  if (path.isAbsolute(name)) {
    if (existsSync(name)) return name;
    throw new Error(
      `TANDEM_CLAUDE_BIN is set to "${name}", but no file exists there.`
    );
  }

  // 2. Ask the platform's resolver (uses the current PATH).
  try {
    const out = execFileSync(isWin ? "where" : "which", [name], {
      encoding: "utf8",
    })
      .split(/\r?\n/)[0]
      .trim();
    if (out && existsSync(out)) return out;
  } catch {
    // Not on PATH — fall through to probing known locations.
  }

  // 3. Probe common install locations directly.
  for (const dir of commonBinDirs()) {
    const candidate = path.join(dir, isWin ? `${name}.cmd` : name);
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not find the Claude Code CLI ("${name}"). It isn't on this process's PATH ` +
      `— built/production servers often run with a minimal PATH that omits ~/.local/bin. ` +
      `Set TANDEM_CLAUDE_BIN to its full path (find it with \`which claude\`).`
  );
}

/** PATH for spawned children: the binary's own dir + common dirs + inherited. */
export function augmentedPath(binPath: string): string {
  const parts = [path.dirname(binPath), ...commonBinDirs()];
  if (process.env.PATH) parts.push(process.env.PATH);
  // De-dupe while preserving order.
  return Array.from(new Set(parts)).join(path.delimiter);
}
