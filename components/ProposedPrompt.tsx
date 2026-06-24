"use client";

import { useState } from "react";
import type { DispatchResultDTO } from "@/lib/clientTypes";

/** Lifecycle of a prompt card within the conversation. */
export type PromptState = "active" | "denied" | "superseded" | "dispatched";

interface ProposedPromptProps {
  prompt: string;
  state: PromptState;
  /** Dispatch outcome (only when state === "dispatched"). */
  dispatch?: DispatchResultDTO | null;
  /** Whether an approve request is currently in flight. */
  isDispatching: boolean;
  /** Show the working-directory field (claude-cli / terminal dispatchers). */
  showCwd?: boolean;
  cwd?: string;
  cwdError?: string | null;
  onCwdChange?: (value: string) => void;
  onApprove: () => void;
  onDeny: () => void;
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked in some contexts; fail quietly.
    }
  };
  return (
    <button
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy prompt"}
      title={copied ? "Copied" : "Copy prompt"}
      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-200 hover:bg-zinc-700/60 hover:text-zinc-200"
    >
      {copied ? (
        <CheckIcon className="h-[15px] w-[15px] text-emerald-400" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[15px] w-[15px]"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

/**
 * The "Proposed Prompt" card — an elevated panel with an inset code block for
 * the prompt and a footer that reflects the card's state: active (Approve/Deny),
 * dispatched (confirmation), denied (revision requested), or superseded (an
 * earlier draft that a newer one has replaced). Read-only states stay in the
 * conversation for reference.
 */
export function ProposedPrompt({
  prompt,
  state,
  dispatch,
  isDispatching,
  showCwd,
  cwd,
  cwdError,
  onCwdChange,
  onApprove,
  onDeny,
}: ProposedPromptProps) {
  const isActive = state === "active";
  const isCurrent = state === "active" || state === "dispatched";
  const label = isCurrent ? "Proposed Prompt" : "Previous draft";

  return (
    <div className="animate-rise w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 shadow-xl shadow-black/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCurrent ? "bg-emerald-500" : "bg-zinc-500"
            }`}
          />
          {label}
        </span>
        <CopyButton value={prompt} />
      </div>

      {/* Prompt — inset rounded code block */}
      <div className="px-3">
        <pre className="tandem-scroll max-h-80 overflow-auto rounded-xl border border-zinc-700/60 bg-zinc-950 px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-zinc-300">
          {prompt}
        </pre>
      </div>

      {/* Footer state */}
      {state === "dispatched" ? (
        <div className="px-4 pb-4 pt-3.5">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <CheckIcon />
            Dispatched
          </p>
          {dispatch && (
            <>
              <p className="mt-1.5 break-all font-mono text-xs text-zinc-500">
                {dispatch.location}
              </p>
              <p className="mt-1 font-mono text-[11px] text-zinc-600">
                id {dispatch.id} · {dispatch.status}
              </p>
            </>
          )}
        </div>
      ) : state === "denied" ? (
        <div className="px-4 pb-4 pt-3">
          <p className="text-sm text-zinc-400">
            Revision requested — describe the change below and I&apos;ll redraft.
          </p>
        </div>
      ) : state === "superseded" ? (
        <div className="px-4 pb-4 pt-3">
          <p className="text-xs text-zinc-500">Replaced by a newer draft.</p>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3">
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
              disabled={isDispatching || !isActive}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDispatching ? (
                "Dispatching…"
              ) : (
                <>
                  <CheckIcon />
                  Approve
                </>
              )}
            </button>
            <button
              onClick={onDeny}
              disabled={isDispatching}
              className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:bg-zinc-700/60 hover:text-zinc-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
