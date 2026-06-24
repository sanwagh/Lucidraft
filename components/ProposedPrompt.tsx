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

function RefreshIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
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
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors duration-200 hover:bg-ink-700/60 hover:text-paper"
    >
      {copied ? (
        <CheckIcon className="h-[15px] w-[15px] text-lamp" />
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

/** The rubber-stamp verdict on the proof — the page's signature element. */
function Stamp({ state }: { state: PromptState }) {
  const map: Record<PromptState, { label: string; cls: string; press?: boolean }> = {
    active: {
      label: "Draft",
      cls: "border-lamp/55 text-lamp ring-lamp/25 bg-lamp/[0.06]",
    },
    dispatched: {
      label: "Dispatched",
      cls: "border-lamp text-lamp-bright ring-lamp/40 bg-lamp/10",
      press: true,
    },
    denied: {
      label: "Revising",
      cls: "border-clay/55 text-clay-bright ring-clay/25 bg-clay/[0.06]",
    },
    superseded: {
      label: "Superseded",
      cls: "border-ink-600 text-paper-faint ring-ink-600/30 bg-transparent opacity-80",
    },
  };
  const { label, cls, press } = map[state];
  return (
    <span
      aria-hidden
      className={[
        "pointer-events-none select-none rounded-[3px] border-2 px-2.5 py-1 ring-1 ring-inset",
        "font-brand text-[10px] font-bold uppercase tracking-[0.2em]",
        "-rotate-3",
        press ? "animate-stamp" : "",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

/**
 * The proof sheet — Lucidraft's signature surface. A drafted prompt arrives as a
 * proof to be marked up: a ruled margin down the prompt body, and a rubber-stamp
 * verdict in the corner that records the decision (Draft → Dispatched, or
 * Revising / Superseded). Decided proofs stay in the conversation for reference.
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
    <div className="animate-rise relative w-full rounded-2xl border border-ink-700 bg-ink-800 shadow-xl shadow-black/40">
      {/* Stamp — overhangs the corner like ink pressed onto paper. */}
      <div className="absolute -right-2.5 -top-3 z-10">
        <Stamp state={state} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5 pr-24">
        <span className="flex items-center gap-2 font-brand text-[10px] font-bold uppercase tracking-[0.18em] text-paper-dim">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCurrent ? "bg-lamp" : "bg-ink-500"
            }`}
          />
          {label}
        </span>
        <CopyButton value={prompt} />
      </div>

      {/* Prompt — inset proof with a ruled drafting margin. */}
      <div className="px-3">
        <pre className="tandem-scroll max-h-80 overflow-auto rounded-xl border border-ink-700/70 border-l-2 border-l-lamp/25 bg-ink-950 px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-paper">
          {prompt}
        </pre>
      </div>

      {/* Footer state */}
      {state === "dispatched" ? (
        <div className="px-4 pb-4 pt-3.5">
          <p className="flex items-center gap-2 text-sm font-medium text-lamp">
            <CheckIcon />
            Sent to your coding agent
          </p>
          {dispatch && (
            <>
              <p className="mt-1.5 break-all font-mono text-xs text-paper-dim">
                {dispatch.location}
              </p>
              <p className="mt-1 font-mono text-[11px] text-paper-faint">
                id {dispatch.id} · {dispatch.status}
              </p>
            </>
          )}
          {/* Re-dispatch the same prompt — opens a fresh terminal (or starts a
              new headless run) without having to redraft. */}
          <button
            onClick={onApprove}
            disabled={isDispatching}
            className="mt-3 flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm font-medium text-paper-dim transition-colors duration-200 hover:border-lamp/40 hover:bg-ink-700/50 hover:text-paper active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshIcon className="h-4 w-4" />
            {isDispatching ? "Launching…" : "Run again"}
          </button>
        </div>
      ) : state === "denied" ? (
        <div className="px-4 pb-4 pt-3">
          <p className="text-sm text-paper-dim">
            Marked for revision — describe the change below and I&apos;ll redraft.
          </p>
        </div>
      ) : state === "superseded" ? (
        <div className="px-4 pb-4 pt-3">
          <p className="text-xs text-paper-faint">Replaced by a newer draft.</p>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3">
          {showCwd && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-paper-dim">
                Project directory{" "}
                <span className="text-paper-faint">— the folder to run in</span>
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
                  "w-full rounded-lg border bg-ink-950 px-3 py-2.5 font-mono text-xs text-paper placeholder:text-paper-faint transition-colors duration-200 focus:outline-none disabled:opacity-60",
                  cwdError
                    ? "border-clay/70 focus:border-clay"
                    : "border-ink-700 focus:border-ink-500",
                ].join(" ")}
              />
              {cwdError && (
                <span className="mt-1.5 block text-xs text-clay-bright">
                  {cwdError}
                </span>
              )}
            </label>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={onApprove}
              disabled={isDispatching || !isActive}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-lamp px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors duration-200 hover:bg-lamp-bright active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDispatching ? (
                "Stamping…"
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
              className="flex-1 rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-medium text-paper-dim transition-colors duration-200 hover:bg-ink-700/60 hover:text-paper active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
