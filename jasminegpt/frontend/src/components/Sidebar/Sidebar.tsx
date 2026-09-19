import type { Conversation } from '../../types';
import { Plus, MessageSquare, Trash2, PanelLeft } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  /** Desktop: collapsed to 72 px icon-rail */
  collapsed?: boolean;
  /** Called when the sidebar toggle icon is clicked */
  onToggle?: () => void;
}

function groupByDate(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const c of conversations) {
    const d = new Date(c.updatedAt ?? c.createdAt ?? 0);
    d.setHours(0, 0, 0, 0);
    if (d >= today) todayItems.push(c);
    else if (d >= yesterday) yesterdayItems.push(c);
    else olderItems.push(c);
  }

  const groups: { label: string; items: Conversation[] }[] = [];
  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (olderItems.length) groups.push({ label: 'Older', items: olderItems });
  return groups;
}

// ── Shared icon-button styles ────────────────────────────────────────────────
const iconBtnBase =
  'flex items-center justify-center rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500';

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  collapsed = false,
  onToggle,
}: SidebarProps) {
  const groups = groupByDate(conversations);

  // ── COLLAPSED — 72 px icon-rail ───────────────────────────────────────────
  if (collapsed) {
    return (
      <aside
        className="sidebar-container h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col items-center flex-shrink-0 py-3 gap-1"
        style={{ width: 72 }}
        aria-label="Sidebar (collapsed)"
      >
        {/*
          In collapsed mode the 🌸 flower acts as the expand trigger,
          exactly like ChatGPT's hamburger icon in the collapsed rail.
        */}
        <button
          type="button"
          onClick={onToggle}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          id="sidebar-toggle-btn"
          className={`${iconBtnBase} w-10 h-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-xl`}
        >
          🌸
        </button>

        <div className="w-8 border-t border-[var(--border)] my-2" />

        {/* New Chat — icon only */}
        <button
          type="button"
          onClick={onCreate}
          id="new-chat-btn"
          title="New chat"
          aria-label="New chat"
          className={`${iconBtnBase} w-10 h-10 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border)] text-emerald-400`}
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="w-8 border-t border-[var(--border)] my-2" />

        {/* Conversation icons */}
        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1 px-1">
          {conversations.map((c) => {
            const isActive = c.conversationId === activeId;
            return (
              <button
                key={c.conversationId}
                type="button"
                id={`conv-${c.conversationId}`}
                onClick={() => onSelect(c.conversationId)}
                title={c.title}
                aria-label={c.title}
                className={`${iconBtnBase} w-10 h-10 ${
                  isActive
                    ? 'bg-[var(--bg-surface-active)] border border-[var(--border)] text-emerald-400'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  // ── EXPANDED — 260 px full sidebar ────────────────────────────────────────
  return (
    <aside
      className="sidebar-container h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col flex-shrink-0 select-none"
      style={{ width: 260 }}
      aria-label="Conversation sidebar"
    >
      {/* ── Header row: ☰  🌸 JasmineGPT ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border)]">
        {/* PanelLeft toggle — collapses the sidebar on desktop, closes drawer on mobile */}
        <button
          type="button"
          onClick={onToggle}
          id="sidebar-toggle-btn"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className={`${iconBtnBase} w-8 h-8 flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]`}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl" aria-hidden="true">🌸</span>
          <span className="font-semibold text-base text-[var(--text-primary)] truncate">
            JasmineGPT
          </span>
        </div>
      </div>

      {/* ── New Chat button ────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={onCreate}
          id="new-chat-btn"
          aria-label="New chat"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium transition-all duration-150 shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Chat</span>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">⌘N</span>
        </button>
      </div>

      {/* ── Conversation list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs" role="list">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)] text-sm">
            <p>No conversations yet.</p>
            <p className="text-xs mt-1 text-[var(--text-secondary)]">
              Click &ldquo;New Chat&rdquo; to begin.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {g.label}
              </div>
              {g.items.map((c) => {
                const isActive = c.conversationId === activeId;
                return (
                  <div
                    key={c.conversationId}
                    role="listitem"
                    tabIndex={0}
                    id={`conv-${c.conversationId}`}
                    onClick={() => onSelect(c.conversationId)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(c.conversationId)}
                    className={`group relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                      isActive
                        ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-medium border border-[var(--border)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <span className="truncate" title={c.title}>
                        {c.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all focus:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.conversationId);
                      }}
                      aria-label={`Delete ${c.title}`}
                      id={`delete-conv-${c.conversationId}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
