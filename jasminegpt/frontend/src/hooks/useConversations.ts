import { useState, useCallback, useEffect } from 'react';
import type { Conversation } from '../types';
import { api } from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listConversations();
      setConversations(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (): Promise<string> => {
    const created = await api.createConversation();
    await fetchConversations();
    return created.conversationId;
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.conversationId !== id));
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  return { conversations, loading, error, createConversation, deleteConversation, refetch: fetchConversations };
}
