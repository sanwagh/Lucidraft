"use client";

import { useRef, useState } from "react";

interface ChatInputProps {
  disabled: boolean;
  /** Placeholder hint, e.g. switches to "Answer the questions…" mid-flow. */
  placeholder?: string;
  onSend: (text: string) => void;
}

/**
 * Composer. A calm rounded box with a hairline border (Claude/ChatGPT-style)
 * and a circular white send button that lights up when there's text.
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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex items-end gap-2 rounded-[1.375rem] border border-zinc-700/80 bg-zinc-800 px-2 py-2 transition-colors duration-200 focus-within:border-zinc-600">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Describe what you want to build…"}
        className="tandem-scroll max-h-48 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-60"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors duration-200 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
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
  );
}
