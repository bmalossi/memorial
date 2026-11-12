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
  /** Injetor de dependência para testes unitários */
  customInvoker?: (
    functionName: string,
    options: { body: any; headers?: Record<string, string> }
  ) => Promise<{ data: any; error: any }>;
  customFallback?: (query: string, signal?: AbortSignal) => Promise<{ results: BibleSearchResult[]; total: number }>;
}

/**
 * Executa a Consulta de Passagem com Confidence Gate e fallback transparente para busca textual.
 */
export async function queryScriptureThread(
  query: string,
  options?: ScriptureThreadQueryOptions
): Promise<ScriptureQueryResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { type: 'keyword_results', results: [], total: 0 };
  }

  const fallbackFn = options?.customFallback || ((q, sig) => searchBibleVerses(q, 0, 50, sig));

  try {
    // 1. Verifica autenticação de sessão
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    // Se o usuário não estiver autenticado (ex.: onboarding ou offline), cai no fallback tradicional
    if (!token && !options?.customInvoker) {
      const fallbackData = await fallbackFn(trimmed, options?.signal);
      return {
        type: 'keyword_results',
        results: fallbackData.results,
        total: fallbackData.total,
      };
    }

    // 2. Invoca a Edge Function scripture-thread
    const invoker = options?.customInvoker || ((fn, opts) => supabase.functions.invoke(fn, opts));
    const { data, error } = await invoker('scripture-thread', {
      body: { user_query: trimmed },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    // 3. Avalia resposta e Confidence Gate
    if (!error && data && data.status === 'matched' && data.passage) {
      return {
        type: 'direct_passage',
        passage: data.passage,
        confidence: data.confidence ?? 1.0,
      };
    }
  } catch (err) {
    console.warn('[scriptureThreadService] Falha ao invocar scripture-thread, acionando fallback:', err);
  }

  // 4. Fallback transparente e silencioso por palavras-chave
  const fallbackData = await fallbackFn(trimmed, options?.signal);
  return {
    type: 'keyword_results',
    results: fallbackData.results,
    total: fallbackData.total,
  };
}
