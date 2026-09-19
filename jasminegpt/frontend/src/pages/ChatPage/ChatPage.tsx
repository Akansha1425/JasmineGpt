import { useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar';
import ChatWindow from '../../components/ChatWindow/ChatWindow';
import { useConversations } from '../../hooks/useConversations';
import type { Conversation } from '../../types';
import './ChatPage.css';

export default function ChatPage() {
  const { conversations, createConversation, deleteConversation, refetch } = useConversations();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCreate = useCallback(async () => {
    const id = await createConversation();
    const conv = { conversationId: id, title: 'New Chat' };
    setActiveConversation(conv);
    setSidebarOpen(false);
  }, [createConversation]);

  const handleSelect = useCallback((id: string) => {
    const conv = conversations.find((c) => c.conversationId === id);
    if (conv) {
      setActiveConversation(conv);
      setSidebarOpen(false);
    }
  }, [conversations]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (activeConversation?.conversationId === id) setActiveConversation(null);
  }, [deleteConversation, activeConversation]);

  // Refresh conversations + active title when a message is sent
  const handleMessageSent = useCallback(async () => {
    await refetch();
    if (activeConversation) {
      const updated = conversations.find((c) => c.conversationId === activeConversation.conversationId);
      if (updated) setActiveConversation(updated);
    }
  }, [refetch, conversations, activeConversation]);

  // Sync active conversation with latest data from conversations list
  const syncedActive = activeConversation
    ? conversations.find((c) => c.conversationId === activeConversation.conversationId) ?? activeConversation
    : null;

  return (
    <div className="chat-page">
      {/* Mobile overlay */}
      <div
        className={`chat-page__overlay${sidebarOpen ? ' chat-page__overlay--visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className={sidebarOpen ? 'sidebar--open' : ''}>
        <Sidebar
          conversations={conversations}
          activeId={activeConversation?.conversationId ?? null}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile menu bar */}
        <div className="chat-page__mobile-menu">
          <button
            className="chat-page__menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            id="mobile-menu-btn"
          >
            ☰
          </button>
        </div>

        <ChatWindow
          conversation={syncedActive}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
