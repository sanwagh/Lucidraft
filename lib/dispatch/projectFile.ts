/**
 * Writing a CLAUDE.md into the target project.
 *
 * When a prompt is dispatched to a project folder, we record it in a CLAUDE.md
 * that lives IN that folder — so every project keeps its own (the Hello-world
 * site gets one in its dir, the statistics site gets its own in its dir) and
 * Claude Code reads it as context on every future run in that folder.
 *
 * Behaviour: create the file if it's missing; otherwise append the prompt as a
 * new timestamped section. Identical prompts (e.g. from "Run again") are not
 * appended twice. Controlled by TANDEM_PROJECT_CLAUDE_MD (default ON; set to
 * "0" / "false" / "no" to disable).
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const FILE_HEADER = `# Project guidance for Claude Code

> Maintained by Lucidraft. Each dispatched prompt is appended below as a
> timestamped section; Claude Code reads this file as context for this project.
`;

function isDisabled(): boolean {
  const v = (process.env.TANDEM_PROJECT_CLAUDE_MD ?? "1").trim().toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}

/**
 * Append (or create) `<cwd>/CLAUDE.md` with the dispatched prompt. Throws a
 * clear error if the file can't be written — the caller surfaces it to the UI.
 * Returns the file path written, or null when disabled / skipped as duplicate.
 */
export async function writeProjectClaudeMd(
  cwd: string,
  prompt: string,
  id: string,
  createdAt: string
): Promise<string | null> {
  if (isDisabled()) return null;

  const file = path.join(cwd, "CLAUDE.md");
  const body = prompt.trim();

  let existing = "";
  let exists = false;
  try {
    existing = await fs.readFile(file, "utf8");
    exists = true;
  } catch {
    // No CLAUDE.md yet — we'll create it below.
  }

  // Skip if this exact prompt is already recorded (e.g. a "Run again").
  if (exists && existing.includes(body)) return file;

  const section = `\n## Prompt — ${createdAt}\n<!-- lucidraft:${id} -->\n\n${body}\n`;
  const toWrite = exists ? section : `${FILE_HEADER}${section}`;

  try {
    await fs.appendFile(file, toWrite, "utf8");
  } catch (err) {
    throw new Error(
      `Couldn't write CLAUDE.md in ${cwd} — ${(err as Error).message}. ` +
        `Check the folder is writable, or set TANDEM_PROJECT_CLAUDE_MD=0 to disable this.`
    );
  }
  return file;
}
