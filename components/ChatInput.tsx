"use client";

import { useRef, useState } from "react";

interface ChatInputProps {
  disabled: boolean;
  /** Placeholder hint, e.g. switches to "Answer the questions…" mid-flow. */
  placeholder?: string;
  onSend: (text: string) => void;
}

/**
 * Composer — a white card with a hairline border. The textarea grows with the
 * message; the send button sits in the bottom-right corner and picks up the
 * pine accent when there's something to send.
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
    <div className="rounded-xl border border-line bg-surface-raised transition-colors duration-150 focus-within:border-line-strong">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Describe what you want to build…"}
        className="tandem-scroll block max-h-60 w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-60"
      />
      <div className="flex items-center justify-end px-3 pb-3 pt-1.5">
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-surface transition-colors duration-150 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-ink-faint"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
