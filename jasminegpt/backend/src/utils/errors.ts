export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  INVALID_REQUEST: (msg: string) => new AppError('INVALID_REQUEST', msg, 400),
  NOT_FOUND: (msg: string) => new AppError('NOT_FOUND', msg, 404),
  INTERNAL: (msg: string) => new AppError('INTERNAL_ERROR', msg, 500),
  RAG_UNAVAILABLE: () =>
    new AppError('RAG_UNAVAILABLE', 'RAG sidecar is not available. Please start the Python RAG service on port 8000.', 503),
  LLM_UNAVAILABLE: () =>
    new AppError('LLM_UNAVAILABLE', 'LLM service is temporarily unavailable.', 503),
  MONGO_UNAVAILABLE: () =>
    new AppError('MONGO_UNAVAILABLE', 'Database is not available.', 503),
  CONVERSATION_NOT_FOUND: (id: string) =>
    new AppError('CONVERSATION_NOT_FOUND', `Conversation not found: ${id}`, 404),
  MISSING_API_KEY: () =>
    new AppError('MISSING_API_KEY', 'OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env.', 503),
};
