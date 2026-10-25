import { z } from 'zod';

export function configuration(env: NodeJS.ProcessEnv = process.env) {
  const config = z.object({
    DATABASE_URL: z.string().url(), DOCUMENT_SERVICE_URL: z.string().url().default('http://documents:8000'),
    STORAGE_DIR: z.string().min(1).default('/var/lib/mmh/originals'),
    AI_MODE: z.enum(['demo', 'live']).default('demo'), OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-5.4-mini-2026-03-17'),
    EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOCAL_ORIGIN: z.string().url().optional(),
  }).parse(env);
  if (config.LOCAL_ORIGIN && !['http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:8080', 'http://127.0.0.1:8080'].includes(config.LOCAL_ORIGIN)) throw new Error('LOCAL_ORIGIN debe ser un origen local permitido.');
  if (config.AI_MODE === 'live' && (config.OPENAI_MODEL !== 'gpt-5.4-mini-2026-03-17' || config.EMBEDDING_MODEL !== 'text-embedding-3-small')) throw new Error('Modelo sin calibración de presupuesto.');
  return config;
}
export type Config = ReturnType<typeof configuration>;
