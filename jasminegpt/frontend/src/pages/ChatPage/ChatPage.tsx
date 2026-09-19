import { useState, useCallback, useEffect } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar';
import ChatWindow from '../../components/ChatWindow/ChatWindow';
import { useConversations } from '../../hooks/useConversations';
import type { Conversation } from '../../types';
import './ChatPage.css';

const SIDEBAR_COLLAPSED_KEY = 'jasminegpt_sidebar_collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
  } catch {
    // ignore
  }
}

export default function ChatPage() {
  const { conversations, createConversation, deleteConversation, refetch } =
    useConversations();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // ── Desktop: collapsed icon-rail (persisted) ──────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readCollapsed);

  // ── Mobile: slide-in drawer (ephemeral) ───────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist desktop collapsed state whenever it changes
  useEffect(() => {
    writeCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Esc key closes the mobile drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  /**
   * Single toggle handler — routes to the right behaviour:
   * • ≥ md (≥ 768 px)  → toggle desktop collapse / expand
   * • < md             → toggle mobile slide-in drawer
   */
  const handleToggleSidebar = useCallback(() => {
    if (window.innerWidth >= 768) {
      setSidebarCollapsed((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    const id = await createConversation();
    const conv: Conversation = { conversationId: id, title: 'New Chat' };
    setActiveConversation(conv);
    setSidebarOpen(false);          // close mobile drawer after creating
  }, [createConversation]);

  const handleSelect = useCallback(
    (id: string) => {
      const conv = conversations.find((c) => c.conversationId === id);
      if (conv) {
        setActiveConversation(conv);
        setSidebarOpen(false);      // close mobile drawer after selecting
      }
    },
    [conversations]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (activeConversation?.conversationId === id) setActiveConversation(null);
    },
    [deleteConversation, activeConversation]
  );

  /** Refresh sidebar titles + active conversation memory after each reply */
  const handleMessageSent = useCallback(async () => {
    await refetch();
    if (activeConversation) {
      setActiveConversation((prev) => {
        if (!prev) return prev;
        const updated = conversations.find(
          (c) => c.conversationId === prev.conversationId
        );
        return updated ?? prev;
      });
    }
  }, [refetch, conversations, activeConversation]);

  // Keep active conversation in sync with the latest list at render time
  const syncedActive = activeConversation
    ? conversations.find(
        (c) => c.conversationId === activeConversation.conversationId
      ) ?? activeConversation
    : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">

      {/* ── Mobile backdrop ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
        ── Sidebar wrapper ────────────────────────────────────────────────────
        Desktop:
          • Always present in the flex row (md:static md:z-auto)
          • Width switches between 260 px (expanded) and 72 px (collapsed)
          • The sidebar-container class adds the CSS width transition
        Mobile:
          • Fixed drawer that slides in/out via translate-x
          • Sits above content (z-40) — width is always 260 px
      */}
      <div
        className={[
          // Mobile: fixed drawer
          'fixed inset-y-0 left-0 z-40',
          // Desktop: static column in the flex row
          'md:static md:z-auto md:flex md:flex-shrink-0',
          // Mobile open/close via translate
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Desktop width transition handled by sidebar-container inside
          'transition-transform duration-[220ms] ease-out md:transition-none',
        ].join(' ')}
      >
        <Sidebar
          conversations={conversations}
          activeId={syncedActive?.conversationId ?? null}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
        />
      </div>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <ChatWindow
          conversation={syncedActive}
          onMessageSent={handleMessageSent}
          onToggleSidebar={handleToggleSidebar}
          onCreateConversation={handleCreate}
        />
      </div>
    </div>
  );
}
