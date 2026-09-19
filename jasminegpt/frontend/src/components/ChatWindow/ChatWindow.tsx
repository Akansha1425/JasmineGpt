import { useState } from 'react';
import type { Conversation, LanguagePreference } from '../../types';
import { useChat } from '../../hooks/useChat';
import { useFarmerProfile } from '../../hooks/useFarmerProfile';
import MessageBubble from '../MessageBubble/MessageBubble';
import ChatInput from '../ChatInput/ChatInput';
import EmptyState from '../EmptyState/EmptyState';
import TypingIndicator from '../TypingIndicator/TypingIndicator';
import ChatHeader from '../ChatHeader/ChatHeader';
import { getStoredLanguagePreference } from '../LanguageSelector/storage';
import { Plus } from 'lucide-react';
import './ChatWindow.css';

interface ChatWindowProps {
  conversation: Conversation | null;
  onMessageSent?: () => void;
  onToggleSidebar?: () => void;
  onCreateConversation?: () => void;
}

export default function ChatWindow({
  conversation,
  onMessageSent,
  onToggleSidebar = () => {},
  onCreateConversation,
}: ChatWindowProps) {
  const [prefill, setPrefill] = useState<string>('');
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(
    getStoredLanguagePreference
  );

  const { messages, sending, error, sendMessage, bottomRef } = useChat(
    conversation?.conversationId ?? null,
    onMessageSent
  );

  // ── Farmer profile derived reactively from messages + backend memory ──────
  // Resets automatically when messages becomes [] (new chat or different conv)
  const farmerProfile = useFarmerProfile(
    messages,
    conversation?.memory,
    languagePreference
  );

  const handleSend = (text: string) => {
    sendMessage(text, languagePreference);
  };

  // ── No active conversation ────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-primary)]">
        <ChatHeader
          conversation={null}
          languagePreference={languagePreference}
          onLanguageChange={setLanguagePreference}
          onToggleSidebar={onToggleSidebar}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-[var(--brand-pink-dim)] border border-pink-500/30 flex items-center justify-center text-3xl mb-4 shadow-sm">
            🌸
          </div>
          <h2 className="text-xl font-bold mb-2">Welcome to JasmineGPT</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
            Select an existing conversation from the sidebar or start a new chat to
            consult verified research on jasmine farming.
          </p>
          {onCreateConversation && (
            <button
              type="button"
              onClick={onCreateConversation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-all duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Chat</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-primary)] relative overflow-hidden">
      {/* 1. Sticky Header — with farmer profile chips */}
      <ChatHeader
        conversation={conversation}
        languagePreference={languagePreference}
        onLanguageChange={setLanguagePreference}
        onToggleSidebar={onToggleSidebar}
        farmerProfile={farmerProfile}
      />

      {/* 2. Scrollable Messages Area — Centered max-width: 860px */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6"
        id="messages-container"
        role="log"
        aria-live="polite"
      >
        <div className="max-w-[860px] mx-auto w-full min-h-full flex flex-col justify-between">
          {messages.length === 0 && !sending ? (
            <EmptyState onPrompt={(text) => setPrefill(text)} />
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.messageId} message={m} />
              ))}
            </div>
          )}

          {/* Typing indicator while waiting for response */}
          {sending && (
            <div
              className="flex items-start gap-3 sm:gap-4 my-4 animate-message-fade-in"
              aria-label="JasmineGPT is responding"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--brand-pink-dim)] border border-pink-500/30 flex items-center justify-center text-base sm:text-lg flex-shrink-0 shadow-sm">
                🌸
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* 3. Sticky Input at bottom — glass/blur */}
      <footer className="sticky bottom-0 z-10 bg-[var(--bg-base)]/80 backdrop-blur-md pt-2 border-t border-[var(--border-subtle)]">
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          error={error}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill('')}
          languagePreference={languagePreference}
          onLanguageChange={setLanguagePreference}
        />
      </footer>
    </div>
  );
}
