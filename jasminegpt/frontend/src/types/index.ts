export type RouteType = 'MEMORY_UPDATE' | 'GENERAL_RAG' | 'POSTHARVEST';

export type EvidenceStatus =
  | 'DIRECT_EVIDENCE'
  | 'MULTIPLE_STUDIES'
  | 'INSUFFICIENT_EVIDENCE'
  | 'SOURCE_REVIEW_REQUIRED'
  | 'NOT_APPLICABLE';

export interface SourceDoc {
  documentId: string;
  title: string;
  authors?: string;
  year?: number;
  doi?: string;
  page?: number;
  score?: number;
  species?: string;
  category?: string;
  isCrossSpecies?: boolean;
  crossSpeciesNote?: string;
}

export interface Message {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  route?: RouteType;
  evidenceStatus?: EvidenceStatus;
  sources?: SourceDoc[];
  resolvedQuery?: string;
  llmCalled?: boolean;
  topScore?: number;
  createdAt?: string;
}

export interface Conversation {
  conversationId: string;
  title: string;
  memory?: {
    species?: string;
    cultivar?: string;
    domains?: string[];
    last_route?: string;
  };
  updatedAt?: string;
  createdAt?: string;
}

export type LanguagePreference = 'auto' | 'en' | 'kn';

export interface ChatResponse {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  userMessage: string;
  assistantMessage: string;
  route: RouteType;
  evidenceStatus: EvidenceStatus;
  llmCalled: boolean;
  sources: SourceDoc[];
  resolvedQuery: string;
  topScore?: number;
  detectedLanguage?: 'en' | 'kn';
  targetLanguage?: 'en' | 'kn';
}
