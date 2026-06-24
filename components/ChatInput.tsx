"use client";

import { useRef, useState } from "react";

interface ChatInputProps {
  disabled: boolean;
  /** Placeholder hint, e.g. switches to "Answer the questions…" mid-flow. */
  placeholder?: string;
  onSend: (text: string) => void;
}

/**
 * Composer — a roomy two-row command bar. The textarea fills the top; a bottom
 * row carries a subtle keyboard hint and the send button. Calm, spacious, and
 * premium rather than crammed into a single line.
 */
export function ChatInput({ disabled, placeholder, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="rounded-3xl border border-ink-700 bg-ink-750/80 shadow-xl shadow-black/40 transition-colors duration-200 focus-within:border-lamp/50 focus-within:bg-ink-750">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Describe what you want to build…"}
        className="tandem-scroll block max-h-60 w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-relaxed text-paper placeholder:text-paper-faint focus:outline-none disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
        <span className="hidden select-none pl-2 font-brand text-[10px] uppercase tracking-[0.12em] text-paper-faint sm:block">
          <span className="text-paper-dim">Enter</span> to send ·{" "}
          <span className="text-paper-dim">Shift + Enter</span> newline
        </span>
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lamp text-ink-900 transition-all duration-200 hover:bg-lamp-bright active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-500"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
