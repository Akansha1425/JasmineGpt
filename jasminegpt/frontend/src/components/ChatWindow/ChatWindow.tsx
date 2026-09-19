import type { Conversation, LanguagePreference } from '../../types';
import { useChat } from '../../hooks/useChat';
import MessageBubble from '../MessageBubble/MessageBubble';
import ChatInput from '../ChatInput/ChatInput';
import EmptyState from '../EmptyState/EmptyState';
import TypingIndicator from '../TypingIndicator/TypingIndicator';
import LanguageSelector, { getStoredLanguagePreference } from '../LanguageSelector/LanguageSelector';
import './ChatWindow.css';
import { useState } from 'react';

interface ChatWindowProps {
  conversation: Conversation | null;
  onMessageSent?: () => void;
}

export default function ChatWindow({ conversation, onMessageSent }: ChatWindowProps) {
  const [prefill, setPrefill] = useState<string>('');
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(getStoredLanguagePreference);

  const { messages, sending, error, sendMessage, bottomRef } = useChat(
    conversation?.conversationId ?? null,
    onMessageSent,
  );

  const handleSend = (text: string) => {
    sendMessage(text, languagePreference);
  };

  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="chat-window__placeholder">
          <div className="chat-window__placeholder-icon">🌸</div>
          <span>Select a conversation or create a new one</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window__header">
        <span style={{ fontSize: 18 }}>🌸</span>
        <span className="chat-window__title">{conversation.title}</span>
        {conversation.memory?.cultivar || conversation.memory?.species ? (
          <div className="chat-window__memory" aria-label="Conversation memory">
            {conversation.memory?.cultivar && (
              <span className="chat-window__memory-chip">cv. {conversation.memory.cultivar}</span>
            )}
            {conversation.memory?.species && (
              <span className="chat-window__memory-chip" style={{ fontStyle: 'italic' }}>
                {conversation.memory.species}
              </span>
            )}
          </div>
        ) : null}
        <LanguageSelector
          value={languagePreference}
          onChange={setLanguagePreference}
        />
      </div>

      {/* Messages */}
      <div className="chat-window__messages" id="messages-container" role="log" aria-live="polite">
        {messages.length === 0 && !sending ? (
          <EmptyState onPrompt={(text) => setPrefill(text)} />
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.messageId} message={m} />
          ))
        )}

        {sending && (
          <div className="chat-window__typing-row" aria-label="JasmineGPT is responding">
            <div className="chat-window__typing-avatar">🌸</div>
            <div className="chat-window__typing-bubble">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={sending}
        error={error}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill('')}
      />
    </div>
  );
}
