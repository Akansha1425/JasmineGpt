import type { Conversation, Message, ChatResponse, LanguagePreference } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Conversations ──────────────────────────────────────────────────────────
export const api = {
  createConversation: (): Promise<{ conversationId: string; title: string }> =>
    request('/api/conversations', { method: 'POST', body: JSON.stringify({}) }),

  listConversations: (): Promise<Conversation[]> =>
    request('/api/conversations'),

  getConversation: (id: string): Promise<Conversation> =>
    request(`/api/conversations/${id}`),

  deleteConversation: (id: string): Promise<void> =>
    request(`/api/conversations/${id}`, { method: 'DELETE' }),

  updateConversation: (id: string, title: string): Promise<Conversation> =>
    request(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  getMessages: (id: string): Promise<Message[]> =>
    request(`/api/conversations/${id}/messages`),

  // ── Chat ──────────────────────────────────────────────────────────────
  sendMessage: (
    conversationId: string,
    message: string,
    languagePreference?: LanguagePreference,
  ): Promise<ChatResponse> =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message, languagePreference }),
    }),
};
