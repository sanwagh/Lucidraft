"use client";

import type { Conversation } from "@/lib/history";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** A small "panel" glyph used for the collapse/expand toggle. */
function PanelIcon() {
  return (
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
  );
}

/**
 * Left-hand chat history (ChatGPT/Claude style): a quiet monochrome wordmark,
 * a "New chat" action, then saved conversations with subtle hover/active states.
 */
export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: SidebarProps) {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
      {/* Brand + collapse toggle */}
      <div className="flex items-center justify-between px-4 pb-4 pt-4">
        <div className="flex items-center gap-2">
          {/* LD monogram — light badge, accent "D" */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 font-brand text-[11px] font-bold leading-none tracking-tight shadow-sm">
            <span className="text-zinc-900">L</span>
            <span className="text-emerald-600">D</span>
          </span>
          <span className="font-brand text-[16px] font-semibold tracking-tight text-zinc-50">
            Lucidraft
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <PanelIcon />
        </button>
      </div>

      <div className="px-3 pb-1">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <span className="text-base leading-none text-zinc-500">+</span>
          New chat
        </button>
      </div>

      <div className="px-4 pb-1.5 pt-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          History
        </span>
      </div>

      <div className="tandem-scroll flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs font-medium text-zinc-500">No saved chats yet</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
              Your prompts will appear here as you go.
            </p>
          </div>
        ) : (
          conversations.map((c) => {
            const active = activeId === c.id;
            return (
              <div
                key={c.id}
                className={[
                  "group mb-0.5 flex items-center gap-1 rounded-lg transition-colors duration-150",
                  active ? "bg-zinc-800" : "hover:bg-zinc-900",
                ].join(" ")}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  className={[
                    "min-w-0 flex-1 truncate px-3 py-2 text-left text-sm transition-colors",
                    active ? "text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200",
                  ].join(" ")}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  title="Delete chat"
                  aria-label="Delete chat"
                  className="mr-1.5 shrink-0 rounded-md p-1 text-zinc-600 opacity-0 transition-all duration-150 hover:text-zinc-300 focus:opacity-100 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-zinc-800 px-4 py-3 text-[11px] text-zinc-600">
        Turn ideas into polished prompts
      </div>
    </aside>
  );
}
