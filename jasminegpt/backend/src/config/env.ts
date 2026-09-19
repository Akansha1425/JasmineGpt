import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017'),
  MONGODB_DB_NAME: z.string().default('jasminesathi_gpt'),

  RAG_SIDECAR_URL: z.string().default('http://localhost:8000'),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),

  MAX_MESSAGE_LENGTH: z.coerce.number().default(4000),
  MAX_CONTEXT_TURNS: z.coerce.number().default(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
