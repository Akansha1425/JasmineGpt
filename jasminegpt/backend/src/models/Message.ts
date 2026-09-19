import mongoose, { Schema, Document, Types } from 'mongoose';
import type { MessageRole, EvidenceStatus, RouteType, SourceDoc } from '../types';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  route?: RouteType;
  evidenceStatus?: EvidenceStatus;
  sources: SourceDoc[];
  resolvedQuery?: string;
  topScore?: number;
  llmCalled?: boolean;
  createdAt: Date;
}

const SourceDocSchema = new Schema<SourceDoc>(
  {
    documentId: String,
    title: String,
    authors: String,
    year: Number,
    doi: String,
    page: Number,
    score: Number,
    species: String,
    category: String,
    isCrossSpecies: Boolean,
    crossSpeciesNote: String,
  },
  { _id: false },
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    route: {
      type: String,
      enum: ['MEMORY_UPDATE', 'GENERAL_RAG', 'POSTHARVEST'],
    },
    evidenceStatus: {
      type: String,
      enum: [
        'DIRECT_EVIDENCE',
        'MULTIPLE_STUDIES',
        'INSUFFICIENT_EVIDENCE',
        'SOURCE_REVIEW_REQUIRED',
        'NOT_APPLICABLE',
      ],
    },
    sources: { type: [SourceDocSchema], default: [] },
    resolvedQuery: String,
    topScore: Number,
    llmCalled: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'messages',
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
