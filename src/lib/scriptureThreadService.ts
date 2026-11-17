/**
 * scriptureThreadService.ts — Serviço de Consulta Bíblica Direta por Intenção ("Scripture Thread")
 *
 * Costura única de alto nível (Single High-Level Seam) para o Memorial:
 * - Consulta a Supabase Edge Function `scripture-thread` (alimentada por TypeSafe JEV).
 * - Se a resposta for uma Passagem-Alvo direta (status: "matched"), entrega os dados estruturados em ACF.
 * - Se a resposta for "unclear" (ou em caso de erro/timeout), aciona silenciosamente o fallback
 *   tradicional por palavras-chave (`searchBibleVerses`), garantindo experiência fluida sem fricção ou menções à IA.
 */

import { supabase } from './supabase';
import { searchBibleVerses, BibleSearchResult } from './searchService';
import { ScripturePassageData } from '../components/bible/ScriptureResultCard';
import { logger } from './logger';

export const DEFAULT_SCRIPTURE_THREAD_TIMEOUT_MS = 4500;

export type ScriptureQueryResult =
  | {
      type: 'direct_passage';
      passage: ScripturePassageData;
      confidence: number;
    }
  | {
      type: 'keyword_results';
      results: BibleSearchResult[];
      total: number;
    };

export interface ScriptureThreadQueryOptions {
  signal?: AbortSignal;
  /** Limite em milissegundos antes de acionar fallback FTS transparente (padrão: 4500ms) */
  timeoutMs?: number;
  /** Injetor de dependência para testes unitários */
  customInvoker?: (
    functionName: string,
    options: { body: any; headers?: Record<string, string> }
  ) => Promise<{ data: any; error: any }>;
  customFallback?: (query: string, signal?: AbortSignal) => Promise<{ results: BibleSearchResult[]; total: number }>;
}

function createAbortError(message = 'Consulta bíblica cancelada'): Error {
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}

function isAbortError(err: any, signal?: AbortSignal): boolean {
  return Boolean(
    signal?.aborted ||
      err?.name === 'AbortError' ||
      err?.message?.includes('canceled') ||
      err?.message?.includes('aborted')
  );
}

/**
 * Executa uma Promise impondo timeout e cancelamento imediato por AbortSignal,
 * garantindo limpeza de timer e listener no bloco finally.
 */
async function raceWithTimeoutAndAbort<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  try {
    const guards: Promise<never>[] = [
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutErr = new Error(`Edge Function scripture-thread excedeu ${timeoutMs}ms`);
          timeoutErr.name = 'TimeoutError';
          reject(timeoutErr);
        }, timeoutMs);
      }),
    ];

    if (signal) {
      guards.push(
        new Promise<never>((_, reject) => {
          onAbort = () => reject(createAbortError());
          signal.addEventListener('abort', onAbort, { once: true });
        })
      );
    }

    return await Promise.race([promise, ...guards]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (signal && onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}

/**
 * Executa a Consulta de Passagem com Confidence Gate, timeout de 4500ms,
 * proteção contra race conditions via AbortSignal e fallback transparente para busca textual.
 */
export async function queryScriptureThread(
  query: string,
  options?: ScriptureThreadQueryOptions
): Promise<ScriptureQueryResult> {
  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { type: 'keyword_results', results: [], total: 0 };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_SCRIPTURE_THREAD_TIMEOUT_MS;
  const fallbackFn = options?.customFallback || ((q, sig) => searchBibleVerses(q, 0, 50, sig));

  try {
    // 1. Obtém token de sessão se existir (opcional)
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const token = sessionData?.session?.access_token;

    if (options?.signal?.aborted) {
      throw createAbortError();
    }

    // 2. Invoca a Edge Function scripture-thread com timeout e cancelamento imediato
    const invoker = options?.customInvoker || ((fn, opts) => supabase.functions.invoke(fn, opts));
    const { data, error } = await raceWithTimeoutAndAbort(
      invoker('scripture-thread', {
        body: { user_query: trimmed },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
      timeoutMs,
      options?.signal
    );

    if (options?.signal?.aborted) {
      throw createAbortError();
    }

    // 3. Avalia resposta e Confidence Gate
    if (!error && data && data.status === 'matched' && data.passage) {
      return {
        type: 'direct_passage',
        passage: data.passage,
        confidence: data.confidence ?? 1.0,
      };
    }
  } catch (err) {
    if (isAbortError(err, options?.signal)) {
      throw createAbortError();
    }
    logger.warn('[scriptureThreadService] Falha/timeout ao invocar scripture-thread, acionando fallback:', err);
  }

  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  // 4. Fallback transparente e silencioso por palavras-chave
  const fallbackData = await fallbackFn(trimmed, options?.signal);

  if (options?.signal?.aborted) {
    throw createAbortError();
  }

  return {
    type: 'keyword_results',
    results: fallbackData.results,
    total: fallbackData.total,
  };
}
