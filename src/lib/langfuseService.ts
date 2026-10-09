/**
 * langfuseService.ts — Memorial App
 *
 * Módulo cliente de Observabilidade e Feedback de IA via Langfuse.
 * Permite registrar métricas de uso e avaliação contínua dos modelos hermenêuticos
 * (LLM-as-a-Judge, avaliações humanas e sinais comportamentais).
 *
 * Boas práticas:
 * - Operações não-bloqueantes (fire-and-forget).
 * - Tratamento gracioso caso as chaves não estejam configuradas.
 * - Registro de sinais comportamentais (leitura de versículo, compartilhamento).
 */

const LANGFUSE_PUBLIC_KEY = process.env.EXPO_PUBLIC_LANGFUSE_PUBLIC_KEY || '';
const LANGFUSE_BASE_URL =
  process.env.EXPO_PUBLIC_LANGFUSE_BASE_URL ||
  process.env.EXPO_PUBLIC_LANGFUSE_HOST ||
  'https://cloud.langfuse.com';

export interface ScorePayload {
  name: string;
  value: number;
  sessionId?: string;
  traceId?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Envia uma pontuação (score/feedback) para o Langfuse via API pública.
 */
export async function sendLangfuseScore(payload: ScorePayload): Promise<void> {
  if (!LANGFUSE_PUBLIC_KEY) {
    // Modo silencioso quando não configurado
    return;
  }

  try {
    const authHeader = 'Basic ' + btoa(`${LANGFUSE_PUBLIC_KEY}:`);
    const endpoint = `${LANGFUSE_BASE_URL.replace(/\/$/, '')}/api/public/scores`;

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        name: payload.name,
        value: payload.value,
        sessionId: payload.sessionId,
        traceId: payload.traceId,
        comment: payload.comment,
        metadata: payload.metadata,
      }),
    });
  } catch (err) {
    // Falha silenciosa para não impactar a experiência de oração do usuário
    console.debug('[LangfuseService] Erro ao enviar pontuação:', err);
  }
}

/**
 * Sinal comportamental positivo: Usuário clicou para ler a passagem sugerida pela IA.
 */
export function trackConnectionRead(entryId: string, reference: string): void {
  sendLangfuseScore({
    name: 'connection_read',
    value: 1,
    sessionId: entryId,
    comment: `Leitor abriu passagem bíblica sugerida: ${reference}`,
    metadata: { reference, entryId },
  }).catch(() => {});
}

/**
 * Sinal comportamental de alto valor: Usuário compartilhou o marco ou a conexão bíblica.
 */
export function trackConnectionShared(entryId: string, reference: string): void {
  sendLangfuseScore({
    name: 'connection_shared',
    value: 1,
    sessionId: entryId,
    comment: `Leitor compartilhou marco com conexão: ${reference}`,
    metadata: { reference, entryId },
  }).catch(() => {});
}
