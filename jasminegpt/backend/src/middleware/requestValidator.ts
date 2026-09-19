import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const chatSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  message: z.string().min(1, 'message is required').max(4000),
  languagePreference: z.enum(['auto', 'en', 'kn']).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  userId: z.string().max(100).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: err.errors.map((e) => e.message).join('; '),
          },
        });
        return;
      }
      next(err);
    }
  };
}
