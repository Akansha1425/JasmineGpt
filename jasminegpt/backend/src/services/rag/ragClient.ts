/**
 * JasmineGPT — RAG Sidecar HTTP Client
 * ======================================
 * Communicates with the Python FastAPI RAG sidecar (port 8000).
 * The backend NEVER performs FAISS/embedding operations directly.
 */

import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { Errors } from '../../utils/errors';
import type { RAGGeneralResult, RAGPostHarvestResult, ConversationMemory } from '../../types';

const ragClient = axios.create({
  baseURL: env.RAG_SIDECAR_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function checkRagHealth(): Promise<boolean> {
  try {
    const res = await ragClient.get('/health');
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
}

export async function retrieveGeneral(
  query: string,
  topK = 5,
  options?: {
    species?: string | null;
    cultivar?: string | null;
    allowCrossSpecies?: boolean;
  },
): Promise<RAGGeneralResult> {
  try {
    const res = await ragClient.post<RAGGeneralResult>('/rag/general', {
      query,
      top_k: topK,
      species: options?.species,
      cultivar: options?.cultivar,
      allow_cross_species: options?.allowCrossSpecies ?? false,
    });
    return res.data;
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error({ err: axErr.message }, 'General RAG retrieval failed');
    if (axErr.code === 'ECONNREFUSED' || axErr.code === 'ENOTFOUND') {
      throw Errors.RAG_UNAVAILABLE();
    }
    throw Errors.INTERNAL('General RAG retrieval error');
  }
}

export async function retrievePostHarvest(
  query: string,
): Promise<RAGPostHarvestResult> {
  try {
    const res = await ragClient.post<RAGPostHarvestResult>('/rag/postharvest', {
      query,
    });
    return res.data;
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error({ err: axErr.message }, 'PostHarvest RAG retrieval failed');
    if (axErr.code === 'ECONNREFUSED' || axErr.code === 'ENOTFOUND') {
      throw Errors.RAG_UNAVAILABLE();
    }
    throw Errors.INTERNAL('PostHarvest RAG retrieval error');
  }
}
