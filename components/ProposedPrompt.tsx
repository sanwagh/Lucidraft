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
  /** Show the working-directory field (claude-cli dispatcher only). */
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

function ClipboardIcon({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Copy-to-clipboard control. Icon-only by default (header); pass `label` for a
 * full button (used as the primary action once a prompt is approved).
 */
function CopyButton({ value, label }: { value: string; label?: string }) {
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

  if (label) {
    return (
      <button
        onClick={copy}
        className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-surface transition-colors duration-150 hover:bg-white active:scale-[0.99]"
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
        {copied ? "Copied" : label}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy prompt"}
      title={copied ? "Copied" : "Copy prompt"}
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-inset hover:text-ink"
    >
      {copied ? (
        <CheckIcon className="h-[15px] w-[15px] text-pine" />
      ) : (
        <ClipboardIcon />
      )}
    </button>
  );
}

/** Status marker in the card header — a small dot and a word, nothing louder. */
function StatusChip({ state }: { state: PromptState }) {
  const map: Record<PromptState, { label: string; dot: string; text: string }> = {
    active: { label: "Draft", dot: "bg-ink-faint", text: "text-ink-muted" },
    dispatched: { label: "Approved", dot: "bg-pine", text: "text-pine" },
    denied: { label: "Revising", dot: "bg-red", text: "text-red" },
    superseded: { label: "Replaced", dot: "bg-ink-faint", text: "text-ink-faint" },
  };
  const { label, dot, text } = map[state];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/**
 * A drafted prompt, presented as a document: header row with the status chip
 * and a copy control, the prompt body in mono on a raised well, and the
 * decision actions in the footer. Decided drafts stay in the conversation
 * for reference.
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
  const label = isCurrent ? "Proposed prompt" : "Previous draft";

  return (
    <div className="animate-rise w-full overflow-hidden rounded-xl border border-line bg-surface-raised">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2.5">
          <span
            className={`text-[13px] font-medium ${
              isCurrent ? "text-ink" : "text-ink-muted"
            }`}
          >
            {label}
          </span>
          <StatusChip state={state} />
        </span>
        <CopyButton value={prompt} />
      </div>

      {/* Prompt body */}
      <pre className="tandem-scroll max-h-80 overflow-auto bg-surface-well px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-ink-soft">
        {prompt}
      </pre>

      {/* Footer state */}
      {state === "dispatched" ? (
        <div className="border-t border-line px-4 pb-4 pt-3.5">
          <p className="text-sm text-ink-muted">
            Copy the prompt and paste it into Claude (or your coding agent).
          </p>
          {dispatch && (
            <p className="mt-1.5 break-all font-mono text-[11px] text-ink-faint">
              saved · {dispatch.location}
            </p>
          )}
          <div className="mt-3">
            <CopyButton value={prompt} label="Copy prompt" />
          </div>
        </div>
      ) : state === "denied" ? (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <p className="text-sm text-ink-muted">
            Marked for revision — describe the change below and I&apos;ll redraft.
          </p>
        </div>
      ) : state === "superseded" ? (
        <div className="border-t border-line px-4 pb-3.5 pt-3">
          <p className="text-xs text-ink-faint">Replaced by a newer draft.</p>
        </div>
      ) : (
        <div className="border-t border-line px-4 pb-4 pt-3.5">
          {showCwd && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">
                Project directory{" "}
                <span className="font-normal text-ink-faint">
                  — the folder to run in
                </span>
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
                  "w-full rounded-md border bg-surface-well px-3 py-2.5 font-mono text-xs text-ink placeholder:text-ink-faint transition-colors duration-150 focus:outline-none disabled:opacity-60",
                  cwdError
                    ? "border-red/60 focus:border-red"
                    : "border-line focus:border-line-strong",
                ].join(" ")}
              />
              {cwdError && (
                <span className="mt-1.5 block text-xs text-red">{cwdError}</span>
              )}
            </label>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={onApprove}
              disabled={isDispatching || !isActive}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-surface transition-colors duration-150 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDispatching ? (
                "Approving…"
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
              className="flex-1 rounded-md border border-line px-4 py-2 text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:border-line-strong hover:bg-surface-inset hover:text-ink active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Request changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
