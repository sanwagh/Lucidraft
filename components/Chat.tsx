"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AssistantTurnDTO,
  ChatMessage,
  DispatchResultDTO,
} from "@/lib/clientTypes";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ProposedPrompt, type PromptState } from "./ProposedPrompt";
import { Sidebar } from "./Sidebar";
import {
  type Conversation,
  deriveTitle,
  loadConversations,
  saveConversations,
} from "@/lib/history";

/**
 * A chat message. Assistant "ready" turns carry the drafted `prompt`; once the
 * user decides, `denied` or `dispatch` records the outcome — all persisted, so
 * prompt cards stay in the conversation and survive reloads.
 */
interface TranscriptMessage extends ChatMessage {
  prompt?: string | null;
  denied?: boolean;
  dispatch?: DispatchResultDTO | null;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Client-side sanity check for the project-directory path. Catches the obvious
 * problems instantly (empty, junk, illegal characters, wrong format) before we
 * bother the server. The server still does the authoritative "does this folder
 * actually exist" check via fs.stat — this is fast feedback, not a replacement.
 * Returns an error message, or null if the path looks structurally valid.
 */
function validatePath(raw: string): string | null {
  if (raw == null) return "Enter your project folder path.";
  const v = raw.trim();
  if (!v) return "Enter your project folder path.";
  if (v.length > 4096) return "That path is far too long.";
  // Null / control characters (0x00-0x1F, 0x7F) are never valid in a path.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(v)) {
    return "Path contains invalid control characters.";
  }

  const isPosixAbs = v.startsWith("/");
  const isWinAbs = /^[A-Za-z]:[\\/]/.test(v); // C:\... or C:/...
  const isUnc = /^\\\\[^\\]/.test(v); // \\server\share

  if (!isPosixAbs && !isWinAbs && !isUnc) {
    return "Use a full path — e.g. /Users/you/Documents/MyApp or C:\\Users\\you\\Documents\\MyApp.";
  }
  // On Windows-style paths these characters are illegal in folder names
  // (the drive-letter colon at index 1 is the only allowed colon).
  if (isWinAbs || isUnc) {
    const rest = v.slice(2);
    if (/[<>"|?*]/.test(rest) || rest.includes(":")) {
      return "Path contains characters that aren't allowed in a folder name.";
    }
  }
  return null;
}

export function Chat() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which dispatcher the backend is using, and the per-project working dir.
  const [dispatcher, setDispatcher] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [cwdError, setCwdError] = useState<string | null>(null);

  // The claude-cli dispatcher runs in a project folder; file-queue doesn't.
  const requiresCwd = dispatcher === "claude-cli";

  // Saved conversation history (left sidebar) and which one is open.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load active dispatcher + the last-used working directory + saved history.
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setDispatcher(c?.dispatcher ?? null))
      .catch(() => setDispatcher(null));
    let savedActive: string | null = null;
    try {
      const saved = localStorage.getItem("tandem.cwd");
      if (saved) setCwd(saved);
      const sb = localStorage.getItem("tandem.sidebarOpen");
      if (sb !== null) setSidebarOpen(sb === "1");
      savedActive = localStorage.getItem("tandem.activeId");
    } catch {
      // localStorage may be unavailable; ignore.
    }
    const convs = loadConversations();
    setConversations(convs);
    // Restore the conversation you were last viewing — with each prompt's
    // decision state intact — so a refresh doesn't drop you back to a blank chat.
    if (savedActive) {
      const conv = convs.find((c) => c.id === savedActive);
      if (conv) {
        setActiveId(conv.id);
        setMessages(conv.messages);
      }
    }
  }, []);

  // Upsert the current conversation into history whenever the transcript grows,
  // and persist right there. We deliberately do NOT have a reactive
  // save-on-[conversations] effect: that would fire on the initial mount (with
  // the empty []) before the loaded data commits and wipe localStorage. Saving
  // only on real mutations is race-free. activeId is guaranteed set (handleSend /
  // loadConversation set it) before any message exists, so this updates in place.
  useEffect(() => {
    if (messages.length === 0 || !activeId) return;
    setConversations((prev) => {
      const now = new Date().toISOString();
      const title = deriveTitle(messages);
      const idx = prev.findIndex((c) => c.id === activeId);
      const next =
        idx >= 0
          ? prev.map((c, i) =>
              i === idx ? { ...c, title, messages, updatedAt: now } : c
            )
          : [
              { id: activeId, title, messages, createdAt: now, updatedAt: now },
              ...prev,
            ];
      saveConversations(next);
      return next;
    });
  }, [messages, activeId]);

  // Persist the working directory so it sticks across reloads and prompts.
  // Editing the path clears any standing validation error (red state).
  const updateCwd = (value: string) => {
    setCwd(value);
    setCwdError(null);
    try {
      localStorage.setItem("tandem.cwd", value);
    } catch {
      // ignore
    }
  };

  // Remember which conversation is open so a refresh can restore it.
  const persistActiveId = (id: string | null) => {
    try {
      if (id) localStorage.setItem("tandem.activeId", id);
      else localStorage.removeItem("tandem.activeId");
    } catch {
      // ignore
    }
  };

  // Collapse / expand the chat-history sidebar (remembered across reloads).
  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("tandem.sidebarOpen", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auto-scroll to the newest message / state change.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /** Build the history we send to the model: include proposed prompts so the
   * model can revise them, and merge isn't needed here (route handles roles). */
  const buildApiMessages = (msgs: TranscriptMessage[]) =>
    msgs.map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.prompt
          ? `${m.content}\n\n--- Proposed prompt ---\n${m.prompt}`
          : m.content,
    }));

  /** Send the current transcript to /api/chat and apply the assistant turn. */
  const requestAssistant = async (nextMessages: TranscriptMessage[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: buildApiMessages(nextMessages) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status}).`);
      }

      const turn = data as AssistantTurnDTO;
      const assistantMsg: TranscriptMessage = {
        id: uid(),
        role: "assistant",
        content: turn.message,
        prompt: turn.status === "ready" ? turn.prompt : null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /** User submits a chat message. Past prompt cards stay in the transcript. */
  const handleSend = (text: string) => {
    // Ensure the conversation has an id before any message is stored.
    if (!activeId) {
      const id = uid();
      setActiveId(id);
      persistActiveId(id);
    }
    const userMsg: TranscriptMessage = { id: uid(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    void requestAssistant(next);
  };

  /** Start a fresh conversation. */
  const newChat = () => {
    setActiveId(null);
    persistActiveId(null);
    setMessages([]);
    setError(null);
    setCwdError(null);
  };

  /** Open a saved conversation. Prompt cards reconstruct from the messages. */
  const loadConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setActiveId(id);
    persistActiveId(id);
    setMessages(conv.messages);
    setError(null);
    setCwdError(null);
  };

  /** Delete a saved conversation. */
  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(next);
      return next;
    });
    if (activeId === id) newChat();
  };

  /** Approve a specific prompt → validate the folder (if needed), then dispatch. */
  const handleApprove = async (id: string, prompt: string) => {
    if (dispatching) return;

    // Validate the project directory up front when the dispatcher needs one.
    if (requiresCwd) {
      const err = validatePath(cwd);
      if (err) {
        setCwdError(err);
        return;
      }
    }
    setCwdError(null);

    setDispatching(true);
    setError(null);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, cwd: cwd.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Dispatch failed (${res.status}).`);
      }
      const result = data as DispatchResultDTO;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, dispatch: result } : m))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Dispatch failed.";
      // Route folder/path failures to the path field; else the error banner.
      if (requiresCwd && /director|folder|path/i.test(msg)) {
        setCwdError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setDispatching(false);
    }
  };

  /** Deny a specific prompt → mark it read-only and ask what to change. */
  const handleDeny = (id: string) => {
    setMessages((prev) => [
      ...prev.map((m) => (m.id === id ? { ...m, denied: true } : m)),
      {
        id: uid(),
        role: "assistant",
        content:
          "No problem — what would you like me to change about the prompt?",
      },
    ]);
  };

  const showEmptyState = messages.length === 0 && !loading;
  const denyAsked =
    messages.length > 0 &&
    messages[messages.length - 1].content.startsWith("No problem");

  // Index of the most recent prompt-bearing message — only that one stays
  // interactive (until decided); earlier ones render read-only.
  let lastPromptIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].prompt) {
      lastPromptIndex = i;
      break;
    }
  }

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={loadConversation}
          onNew={newChat}
          onDelete={deleteConversation}
          onClose={toggleSidebar}
        />
      )}

      <div className="relative flex h-full flex-1 flex-col">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="absolute left-3 top-3 z-10 hidden h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-ink-400 transition-colors duration-200 hover:bg-ink-800 hover:text-paper md:flex"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
        )}
        {/* Transcript */}
        <div
          ref={scrollRef}
          className="tandem-scroll tandem-grid flex-1 overflow-y-auto px-6 py-8"
        >
          {showEmptyState ? (
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-9 pb-16">
              <EmptyState />
              <div className="w-full">
                <ChatInput
                  disabled={loading}
                  placeholder="Describe what you want to build…"
                  onSend={handleSend}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              {messages.map((m, i) => {
                if (!m.prompt) {
                  return <MessageBubble key={m.id} message={m} />;
                }
                const isLast = i === lastPromptIndex;
                const state: PromptState = m.dispatch
                  ? "dispatched"
                  : isLast && !m.denied
                  ? "active"
                  : m.denied && isLast
                  ? "denied"
                  : "superseded";
                return (
                  <ProposedPrompt
                    key={m.id}
                    prompt={m.prompt}
                    state={state}
                    dispatch={m.dispatch}
                    isDispatching={dispatching}
                    showCwd={requiresCwd}
                    cwd={cwd}
                    cwdError={cwdError}
                    onCwdChange={updateCwd}
                    onApprove={() => handleApprove(m.id, m.prompt as string)}
                    onDeny={() => handleDeny(m.id)}
                  />
                );
              })}

              {loading && <ThinkingBubble />}

              {error && (
                <div className="animate-rise rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay-bright shadow-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer — docks at the bottom once a conversation has started. */}
        {!showEmptyState && (
          <div className="bg-ink-900 px-6 pb-7 pt-2">
            <div className="animate-settle mx-auto w-full max-w-3xl">
              <ChatInput
                disabled={loading}
                placeholder={denyAsked ? "Tell me what to change…" : "Reply…"}
                onSend={handleSend}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <span className="font-brand text-[10px] font-bold uppercase tracking-[0.35em] text-paper-faint">
        Drafting desk for AI agents
      </span>

      <h1 className="mt-4 font-brand text-[3.25rem] font-bold leading-none tracking-tight text-paper-bright">
        lucidraft<span className="animate-pulse text-lamp">_</span>
      </h1>

      <p className="mt-5 text-lg font-medium text-paper-bright">
        Rough idea in.{" "}
        <span className="text-paper-dim">Polished prompt out.</span>
      </p>
      <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-paper-dim">
        Describe what you want — Lucidraft asks the right questions, drafts a
        clean prompt, and you stamp it ready to run.
      </p>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex animate-rise justify-start">
      <div className="flex items-center gap-1.5 py-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lamp/70 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lamp/70 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lamp/70" />
      </div>
    </div>
  );
}
