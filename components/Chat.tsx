"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AssistantTurnDTO,
  ChatMessage,
  DispatchResultDTO,
} from "@/lib/clientTypes";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ProposedPrompt } from "./ProposedPrompt";
import { Sidebar } from "./Sidebar";
import {
  type Conversation,
  deriveTitle,
  loadConversations,
  saveConversations,
} from "@/lib/history";

/** A ChatMessage that may carry the full proposed prompt for model context. */
interface TranscriptMessage extends ChatMessage {
  /** Set on assistant "ready" turns so revisions keep full context. */
  prompt?: string | null;
}

/** The prompt currently awaiting Approve/Deny, plus its dispatch outcome. */
interface ActiveProposal {
  prompt: string;
  dispatch: DispatchResultDTO | null;
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
  const [proposal, setProposal] = useState<ActiveProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which dispatcher the backend is using, and the per-project working dir.
  const [dispatcher, setDispatcher] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [cwdError, setCwdError] = useState<string | null>(null);

  // The terminal / claude-cli dispatchers run in a folder; file-queue doesn't.
  const requiresCwd = dispatcher === "claude-cli" || dispatcher === "terminal";

  // Saved conversation history (left sidebar) and which one is open.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load active dispatcher + the last-used working directory + saved history.
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setDispatcher(c?.dispatcher ?? null))
      .catch(() => setDispatcher(null));
    try {
      const saved = localStorage.getItem("tandem.cwd");
      if (saved) setCwd(saved);
    } catch {
      // localStorage may be unavailable; ignore.
    }
    setConversations(loadConversations());
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

  // Auto-scroll to the newest message / state change.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, proposal, loading]);

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

      if (turn.status === "ready" && turn.prompt) {
        setProposal({ prompt: turn.prompt, dispatch: null });
      } else {
        setProposal(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  /** User submits a chat message. */
  const handleSend = (text: string) => {
    // Ensure the conversation has an id before any message is stored.
    if (!activeId) setActiveId(uid());
    const userMsg: TranscriptMessage = { id: uid(), role: "user", content: text };
    // Any pending proposal is superseded once the user keeps talking.
    setProposal(null);
    const next = [...messages, userMsg];
    setMessages(next);
    void requestAssistant(next);
  };

  /** Start a fresh conversation. */
  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setProposal(null);
    setError(null);
    setCwdError(null);
  };

  /** Open a saved conversation and restore its proposed-prompt card. */
  const loadConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setActiveId(id);
    setMessages(conv.messages);
    setError(null);
    setCwdError(null);
    // Re-show the last drafted prompt (if any) so it can be re-approved.
    const lastWithPrompt = [...conv.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.prompt);
    setProposal(
      lastWithPrompt?.prompt ? { prompt: lastWithPrompt.prompt, dispatch: null } : null
    );
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

  /** Approve → validate the folder (if needed), then dispatch the prompt. */
  const handleApprove = async () => {
    if (!proposal || dispatching) return;

    // Validate the project directory up front when the dispatcher needs one.
    // On failure we mark the field red and stop — fix it and click Approve again.
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
        body: JSON.stringify({ prompt: proposal.prompt, cwd: cwd.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Dispatch failed (${res.status}).`);
      }
      setProposal((p) => (p ? { ...p, dispatch: data as DispatchResultDTO } : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Dispatch failed.";
      // Route folder/path failures (e.g. "directory doesn't exist") to the
      // path field; anything else goes to the general error banner.
      if (requiresCwd && /director|folder|path/i.test(msg)) {
        setCwdError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setDispatching(false);
    }
  };

  /** Deny → ask the user what to change, then loop back through the model. */
  const handleDeny = () => {
    if (!proposal) return;
    setProposal(null);
    setMessages((prev) => [
      ...prev,
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

  return (
    <div className="flex h-full">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={loadConversation}
        onNew={newChat}
        onDelete={deleteConversation}
      />

      <div className="flex h-full flex-1 flex-col">
      {/* Transcript */}
      <div
        ref={scrollRef}
        className="tandem-scroll flex-1 overflow-y-auto px-6 py-8"
      >
        {showEmptyState ? (
          <div className="flex min-h-full items-center justify-center pb-16">
            <EmptyState />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {proposal && (
              <ProposedPrompt
                prompt={proposal.prompt}
                dispatch={proposal.dispatch}
                isDispatching={dispatching}
                showCwd={requiresCwd}
                cwd={cwd}
                cwdError={cwdError}
                onCwdChange={updateCwd}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            )}

            {loading && <ThinkingBubble />}

            {error && (
              <div className="animate-rise rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 shadow-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-800 bg-zinc-900 px-6 py-5">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            disabled={loading}
            placeholder={
              denyAsked
                ? "Tell me what to change…"
                : messages.length > 0
                ? "Reply…"
                : undefined
            }
            onSend={handleSend}
          />
          <p className="mt-2.5 text-center text-[11px] text-zinc-600">
            Approve to dispatch · Enter to send
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-100">
        PromptTandem
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-500">
        Describe a rough idea. I&apos;ll ask any clarifying questions, then draft a
        polished, ready-to-run prompt you can approve and dispatch.
      </p>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex animate-rise justify-start">
      <div className="flex items-center gap-1.5 py-2">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
      </div>
    </div>
  );
}
