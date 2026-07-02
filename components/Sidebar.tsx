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

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Left-hand chat history. A quiet raised panel: plain wordmark up top, a
 * bordered "New draft" action, and saved drafts below — the open one lifted
 * onto a white card.
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
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-line bg-surface-raised md:flex">
      {/* Brand + collapse toggle */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Lucidraft
        </span>
        <button
          onClick={onClose}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-inset hover:text-ink"
        >
          <PanelIcon />
        </button>
      </div>

      <div className="px-3 pb-1">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:border-line-strong hover:bg-surface-inset hover:text-ink"
        >
          <span className="text-base leading-none text-ink-muted">+</span>
          New draft
        </button>
      </div>

      <div className="px-4 pb-1.5 pt-5">
        <span className="text-[11px] font-medium text-ink-faint">Recent</span>
      </div>

      <div className="tandem-scroll flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs font-medium text-ink-muted">No drafts yet</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
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
                  "group mb-0.5 flex items-center gap-1 rounded-md transition-colors duration-150",
                  active ? "bg-surface-inset" : "hover:bg-surface-inset/60",
                ].join(" ")}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  className={[
                    "min-w-0 flex-1 truncate px-3 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "font-medium text-ink"
                      : "text-ink-soft group-hover:text-ink",
                  ].join(" ")}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  title="Delete draft"
                  aria-label="Delete draft"
                  className="mr-1.5 shrink-0 rounded-md p-1 text-ink-faint opacity-0 transition-all duration-150 hover:text-red focus:opacity-100 group-hover:opacity-100"
                >
                  <XIcon />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
