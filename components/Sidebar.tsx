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
 * Left-hand chat history. A stamp-badge monogram and Space Mono wordmark set the
 * drafting-desk identity; saved conversations sit quietly below, the open one
 * marked with a lamplight rule down its left edge.
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
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-ink-700/60 bg-ink-950 md:flex">
      {/* Brand + collapse toggle */}
      <div className="flex items-center justify-between px-4 pb-4 pt-4">
        <div className="flex items-center gap-2.5">
          {/* Stamp-badge monogram — amber ring, like an ink stamp. */}
          <span className="flex h-7 w-7 -rotate-3 items-center justify-center rounded-[5px] border-2 border-lamp/60 bg-lamp/[0.08] font-brand text-[11px] font-bold leading-none tracking-tight text-lamp ring-1 ring-inset ring-lamp/25">
            ld
          </span>
          <span className="font-brand text-[15px] font-bold tracking-tight text-paper-bright">
            lucidraft
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-400 transition-colors duration-200 hover:bg-ink-800 hover:text-paper"
        >
          <PanelIcon />
        </button>
      </div>

      <div className="px-3 pb-1">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm font-medium text-paper-dim transition-colors duration-200 hover:border-lamp/40 hover:bg-ink-850 hover:text-paper"
        >
          <span className="text-base leading-none text-lamp">+</span>
          New draft
        </button>
      </div>

      <div className="px-4 pb-1.5 pt-4">
        <span className="font-brand text-[10px] font-bold uppercase tracking-[0.2em] text-paper-faint">
          History
        </span>
      </div>

      <div className="tandem-scroll flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs font-medium text-paper-dim">No drafts yet</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-paper-faint">
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
                  "group relative mb-0.5 flex items-center gap-1 rounded-lg transition-colors duration-150",
                  active ? "bg-ink-800" : "hover:bg-ink-850",
                ].join(" ")}
              >
                {/* Lamplight rule marks the open draft. */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-lamp" />
                )}
                <button
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  className={[
                    "min-w-0 flex-1 truncate px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "text-paper-bright"
                      : "text-paper-dim group-hover:text-paper",
                  ].join(" ")}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  title="Delete chat"
                  aria-label="Delete chat"
                  className="mr-1.5 shrink-0 rounded-md p-1 text-ink-400 opacity-0 transition-all duration-150 hover:text-clay-bright focus:opacity-100 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-ink-700/60 px-4 py-3 font-brand text-[10px] uppercase tracking-[0.15em] text-paper-faint">
        Rough idea in · polished prompt out
      </div>
    </aside>
  );
}
