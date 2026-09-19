/**
 * JasmineGPT — Conversation Service
 * ===================================
 * Handles all MongoDB operations for conversations and messages.
 * Also manages memory updates from entity extraction.
 */

import { Types } from 'mongoose';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { Errors } from '../../utils/errors';
import type {
  ConversationMemory,
  RouteType,
  EvidenceStatus,
  SourceDoc,
  MessageRole,
} from '../../types';
import { extractEntities } from '../router/contextResolver';

// ────────────────────────────────────────────────────────────────────────────
// Conversations
// ────────────────────────────────────────────────────────────────────────────
export async function createConversation(
  userId = 'default_user',
  title = 'New Chat',
): Promise<IConversation> {
  const conv = new Conversation({ userId, title });
  return conv.save();
}

export async function listConversations(
  userId = 'default_user',
  limit = 50,
): Promise<IConversation[]> {
  const docs = await Conversation.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return docs as unknown as IConversation[];
}

export async function getConversation(id: string): Promise<IConversation> {
  if (!Types.ObjectId.isValid(id)) throw Errors.NOT_FOUND(`Invalid conversation ID: ${id}`);
  const conv = await Conversation.findById(id).lean();
  if (!conv) throw Errors.CONVERSATION_NOT_FOUND(id);
  return conv as unknown as IConversation;
}

export async function deleteConversation(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw Errors.NOT_FOUND(`Invalid conversation ID: ${id}`);
  const result = await Conversation.findByIdAndDelete(id);
  if (!result) throw Errors.CONVERSATION_NOT_FOUND(id);
  // Delete all messages for this conversation
  await Message.deleteMany({ conversationId: new Types.ObjectId(id) });
}

export async function updateConversationTitle(
  id: string,
  title: string,
): Promise<IConversation> {
  if (!Types.ObjectId.isValid(id)) throw Errors.NOT_FOUND(`Invalid conversation ID: ${id}`);
  const conv = await Conversation.findByIdAndUpdate(
    id,
    { title },
    { new: true },
  );
  if (!conv) throw Errors.CONVERSATION_NOT_FOUND(id);
  return conv;
}

// ────────────────────────────────────────────────────────────────────────────
// Messages
// ────────────────────────────────────────────────────────────────────────────
export async function getMessages(
  conversationId: string,
  limit = 100,
): Promise<IMessage[]> {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw Errors.NOT_FOUND(`Invalid conversation ID: ${conversationId}`);
  }
  const docs = await Message.find({ conversationId: new Types.ObjectId(conversationId) })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return docs as unknown as IMessage[];
}

export async function appendMessage(params: {
  conversationId: string;
  role: MessageRole;
  content: string;
  route?: RouteType;
  evidenceStatus?: EvidenceStatus;
  sources?: SourceDoc[];
  resolvedQuery?: string;
  llmCalled?: boolean;
}): Promise<IMessage> {
  const msg = new Message({
    conversationId: new Types.ObjectId(params.conversationId),
    role: params.role,
    content: params.content,
    route: params.route,
    evidenceStatus: params.evidenceStatus,
    sources: params.sources ?? [],
    resolvedQuery: params.resolvedQuery,
    llmCalled: params.llmCalled ?? false,
  });
  return msg.save();
}

// ────────────────────────────────────────────────────────────────────────────
// Memory
// ────────────────────────────────────────────────────────────────────────────
export async function getMemory(conversationId: string): Promise<ConversationMemory> {
  const conv = await getConversation(conversationId);
  return conv.memory ?? {};
}

export async function updateMemory(
  conversationId: string,
  updates: Partial<ConversationMemory>,
): Promise<void> {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw Errors.NOT_FOUND(`Invalid conversation ID: ${conversationId}`);
  }
  // Build $set keys for nested memory fields
  const setOps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined && v !== null) {
      setOps[`memory.${k}`] = v;
    }
  }
  await Conversation.findByIdAndUpdate(conversationId, { $set: setOps });
}

/** Extract entities from a question and merge into conversation memory. */
export async function mergeMemoryFromQuestion(
  conversationId: string,
  question: string,
  route: RouteType,
  selectedDocs: string[] = [],
): Promise<void> {
  const existing = await getMemory(conversationId);
  const entities = extractEntities(question);

  const updates: Partial<ConversationMemory> = {
    last_route: route,
  };

  if (entities.species && !existing.species) updates.species = entities.species;
  if (entities.cultivar && !existing.cultivar) updates.cultivar = entities.cultivar;

  const existingDomains = existing.domains ?? [];
  const newDomains = entities.domains.filter((d) => !existingDomains.includes(d));
  if (newDomains.length > 0) {
    updates.domains = [...existingDomains, ...newDomains];
  }

  if (selectedDocs.length > 0) {
    updates.last_document_ids = selectedDocs;
  }

  await updateMemory(conversationId, updates);
}

/** Fetch recent turns for context resolution. */
export async function getRecentTurns(
  conversationId: string,
  maxTurns = 8,
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const msgs = await Message.find({
    conversationId: new Types.ObjectId(conversationId),
  })
    .sort({ createdAt: -1 })
    .limit(maxTurns)
    .lean();

  return msgs
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

/** Auto-generate a conversation title from the first user message. */
export function generateTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  return words.length > 3 ? words : 'New Chat';
}
