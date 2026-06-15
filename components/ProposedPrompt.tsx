"use client";

import { useState } from "react";
import type { DispatchResultDTO } from "@/lib/clientTypes";

interface ProposedPromptProps {
  prompt: string;
  /** Dispatch outcome for this card, if it has been approved. */
  dispatch?: DispatchResultDTO | null;
  /** Whether an approve request is currently in flight. */
  isDispatching: boolean;
  /** Show the working-directory field (claude-cli / terminal dispatchers). */
  showCwd?: boolean;
  /** Current working-directory value. */
  cwd?: string;
  /** Validation error for the directory field, if any (turns the box red). */
  cwdError?: string | null;
  onCwdChange?: (value: string) => void;
  onApprove: () => void;
  onDeny: () => void;
}

/**
 * The "Proposed Prompt" card. Flat surface, hairline border, monospace body —
 * restrained like a Supabase/Linear panel. Settles into a calm confirmed state
 * once dispatched.
 */
export function ProposedPrompt({
  prompt,
  dispatch,
  isDispatching,
  showCwd,
  cwd,
  cwdError,
  onCwdChange,
  onApprove,
  onDeny,
}: ProposedPromptProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked in some contexts; fail quietly.
    }
  };

  const dispatched = Boolean(dispatch);

  return (
    <div className="animate-rise my-1 w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Proposed Prompt
        </span>
        <button
          onClick={copy}
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-200"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="tandem-scroll max-h-80 overflow-auto whitespace-pre-wrap break-words bg-zinc-950 px-4 py-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">
        {prompt}
      </pre>

      {dispatched ? (
        <div className="border-t border-zinc-700 px-4 py-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Dispatched
          </p>
          <p className="mt-1.5 break-all font-mono text-xs text-zinc-500">
            {dispatch!.location}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-600">
            id {dispatch!.id} · {dispatch!.status}
          </p>
        </div>
      ) : (
        <div className="border-t border-zinc-700 px-4 py-4">
          {showCwd && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Project directory{" "}
                <span className="text-zinc-600">— the folder to run in</span>
              </span>
              <input
                type="text"
                value={cwd ?? ""}
                onChange={(e) => onCwdChange?.(e.target.value)}
                disabled={isDispatching}
                placeholder="/Users/you/Documents/MyApp"
                spellCheck={false}
                aria-invalid={Boolean(cwdError)}
                className={[
                  "w-full rounded-lg border bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 transition-colors duration-200 focus:outline-none disabled:opacity-60",
                  cwdError
                    ? "border-rose-500/70 focus:border-rose-500"
                    : "border-zinc-700 focus:border-zinc-500",
                ].join(" ")}
              />
              {cwdError && (
                <span className="mt-1.5 block text-xs text-rose-400">
                  {cwdError}
                </span>
              )}
            </label>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={onApprove}
              disabled={isDispatching}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDispatching ? "Dispatching…" : "Approve"}
            </button>
            <button
              onClick={onDeny}
              disabled={isDispatching}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:bg-zinc-700 hover:text-zinc-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
