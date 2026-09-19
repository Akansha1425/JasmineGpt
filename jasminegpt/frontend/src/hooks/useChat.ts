import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, LanguagePreference } from '../types';
import { api } from '../services/api';

export function useChat(conversationId: string | null, onTitleChange?: () => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history when conversation changes
  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    api.getMessages(conversationId).then(setMessages).catch(() => setMessages([]));
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = useCallback(async (content: string, languagePreference?: LanguagePreference) => {
    if (!conversationId || !content.trim() || sending) return;
    setError(null);
    setSending(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: Message = { messageId: tempId, role: 'user', content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.sendMessage(conversationId, content.trim(), languagePreference);
      // Replace optimistic + add assistant
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.messageId !== tempId);
        const userFinal: Message = { messageId: res.userMessageId, role: 'user', content: res.userMessage };
        const assistantMsg: Message = {
          messageId: res.assistantMessageId,
          role: 'assistant',
          content: res.assistantMessage,
          route: res.route,
          evidenceStatus: res.evidenceStatus,
          sources: res.sources,
          resolvedQuery: res.resolvedQuery,
          llmCalled: res.llmCalled,
        };
        return [...withoutTemp, userFinal, assistantMsg];
      });
      onTitleChange?.();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [conversationId, sending, onTitleChange]);

  return { messages, sending, error, sendMessage, bottomRef };
}
