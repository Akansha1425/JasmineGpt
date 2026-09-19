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

/** Session-scoped farmer profile — derived from messages, never persisted */
export interface FarmerProfile {
  /** e.g. "Jasminum sambac" */
  species?: string;
  /** e.g. "Gundumalli" */
  cultivar?: string;
  /** e.g. "Karnataka" */
  state?: string;
  /** e.g. "Hassan" */
  district?: string;
  /** display label, e.g. "ಕನ್ನಡ" or "English" */
  language?: string;
  /** e.g. "garland making", "commercial export" */
  farmingPurpose?: string;
}

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
