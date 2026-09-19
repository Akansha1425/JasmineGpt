import { Request, Response, NextFunction } from 'express';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  getMessages,
} from '../services/conversation/conversationService';
import { logger } from '../utils/logger';

export async function handleCreateConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, userId } = req.body as { title?: string; userId?: string };
    const conv = await createConversation(userId, title);
    res.status(201).json({
      conversationId: conv._id,
      title: conv.title,
      createdAt: conv.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req.query['userId'] as string) ?? 'default_user';
    const convs = await listConversations(userId);
    res.json(
      convs.map((c) => ({
        conversationId: c._id,
        title: c.title,
        memory: c.memory,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function handleGetConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conv = await getConversation(req.params['id']!);
    res.json({
      conversationId: conv._id,
      title: conv.title,
      memory: conv.memory,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteConversation(req.params['id']!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title } = req.body as { title?: string };
    if (!title) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'title is required' } });
      return;
    }
    const conv = await updateConversationTitle(req.params['id']!, title);
    res.json({ conversationId: conv._id, title: conv.title });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const msgs = await getMessages(req.params['id']!);
    res.json(
      msgs.map((m) => ({
        messageId: m._id,
        role: m.role,
        content: m.content,
        route: m.route,
        evidenceStatus: m.evidenceStatus,
        sources: m.sources,
        resolvedQuery: m.resolvedQuery,
        llmCalled: m.llmCalled,
        createdAt: m.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
}
