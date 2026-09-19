import mongoose, { Schema, Document } from 'mongoose';
import type { ConversationMemory } from '../types';

export interface IConversation extends Document {
  userId: string;
  title: string;
  memory: ConversationMemory;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, default: 'default_user', index: true },
    title: { type: String, default: 'New Chat' },
    memory: {
      species: { type: String, default: null },
      cultivar: { type: String, default: null },
      domains: { type: [String], default: [] },
      last_route: { type: String, default: null },
      last_document_ids: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  },
);

ConversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema,
);
