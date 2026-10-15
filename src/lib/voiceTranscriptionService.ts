/**
 * voiceTranscriptionService.ts — Bíblia Vive / Memorial
 *
 * Módulo de gravação e transcrição de voz em alta fidelidade.
 * Arquitetura blindada: Zero credenciais no cliente móvel.
 * - Armazenamento de áudio direto via Cloudflare R2 (presigned PUT)
 * - Processamento seguro via Backend Proxy STT (Bíblia Vive / AssemblyAI Universal-2 pt-BR)
 */

const STT_API_URL =
  process.env.EXPO_PUBLIC_STT_API_URL ||
  'https://www.bibliavive.com.br/api/stt';

export const CODE_QUOTA_EXCEEDED = 'quota_exceeded';

export class TranscriptionError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = 'TranscriptionError';
    this.status = options?.status;
    this.code = options?.code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  get isQuotaExceeded(): boolean {
    return this.code === CODE_QUOTA_EXCEEDED;
  }
}

export interface TranscriptionProgress {
  status: 'uploading' | 'transcribing' | 'completed' | 'local' | 'error';
  message: string;
}

export type TranscriptionEngine = 'premium' | 'local';

export type EngineDecisionReason =
  | 'quota_available'
  | 'quota_exceeded'
  | 'offline'
  | 'unknown_assumed_premium';

export interface EngineDecision {
  engine: TranscriptionEngine;
  reason: EngineDecisionReason;
  resetAt?: number;
}

export interface QuotaCacheEntry {
  status: 'available' | 'exceeded';
  cachedAt: number;
  ttlMs: number;
  resetAt?: number;
}

export interface LocalSpeechRecognizer {
  isAvailable(): Promise<boolean>;
  start(callbacks?: { onPartialResult?: (text: string) => void; onError?: (err: any) => void }): Promise<void>;
  stop(): Promise<string>;
  cancel(): Promise<void>;
  transcribeAudioFile(audioUri: string, onProgress?: (p: TranscriptionProgress) => void): Promise<string>;
}

export interface TranscriptionServiceDependencies {
  fetchFn?: typeof fetch;
  localRecognizer?: LocalSpeechRecognizer;
  uploader?: (audioUri: string, uploadUrl: string) => Promise<boolean>;
  networkChecker?: () => Promise<boolean>;
}

let activeDependencies: TranscriptionServiceDependencies = {};

let quotaCache: QuotaCacheEntry | null = null;
const DEFAULT_AVAILABLE_CACHE_TTL_MS = 60 * 1000; // 60s
const DEFAULT_EXCEEDED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function getQuotaCache(): QuotaCacheEntry | null {
  if (!quotaCache) return null;
  const now = Date.now();
  if (quotaCache.resetAt && now >= quotaCache.resetAt) {
    quotaCache = null;
    return null;
  }
  if (now - quotaCache.cachedAt > quotaCache.ttlMs) {
    quotaCache = null;
    return null;
  }
  return quotaCache;
}

export function setQuotaCache(
  status: 'available' | 'exceeded',
  options?: { ttlMs?: number; resetAt?: number }
): void {
  const now = Date.now();
  const ttlMs =
    options?.ttlMs ??
    (status === 'available'
      ? DEFAULT_AVAILABLE_CACHE_TTL_MS
      : DEFAULT_EXCEEDED_CACHE_TTL_MS);
  quotaCache = {
    status,
    cachedAt: now,
    ttlMs,
    resetAt: options?.resetAt,
  };
}

export function clearQuotaCache(): void {
  quotaCache = null;
}

export function setTranscriptionDependencies(deps: Partial<TranscriptionServiceDependencies>): void {
  activeDependencies = { ...activeDependencies, ...deps };
}

export function setLocalSpeechRecognizer(recognizer: LocalSpeechRecognizer): void {
  activeDependencies.localRecognizer = recognizer;
}

export function resetTranscriptionDependencies(): void {
  activeDependencies = {};
  clearQuotaCache();
}

function getFetch(): typeof fetch {
  return activeDependencies.fetchFn || fetch;
}

export async function checkNetworkConnectivity(): Promise<boolean> {
  if (activeDependencies.networkChecker) {
    try {
      return await activeDependencies.networkChecker();
    } catch {
      return false;
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Decide o motor de transcrição antes de gravar:
 * 1. Sem conectividade: vai direto ao modo local ('offline').
 * 2. Com cache conhecido de cota:
 *    - Se 'exceeded': vai direto ao modo local ('quota_exceeded').
 *    - Se 'available': usa modo premium ('quota_available') em 0ms.
 * 3. Se desconhecido ou expirado: consulta leve com timeout curto (1500ms).
 *    - Se cota estourada: guarda no cache e vai ao modo local.
 *    - Se cota disponível: guarda no cache e vai ao modo premium.
 *    - Se desconhecido (404/501/servidor sem rota de cota): assume premium.
 */
export async function decideTranscriptionEngine(): Promise<EngineDecision> {
  const isOnline = await checkNetworkConnectivity();
  if (!isOnline) {
    return { engine: 'local', reason: 'offline' };
  }

  const cached = getQuotaCache();
  if (cached) {
    if (cached.status === 'exceeded') {
      return { engine: 'local', reason: 'quota_exceeded', resetAt: cached.resetAt };
    }
    return { engine: 'premium', reason: 'quota_available' };
  }

  const fetchFn = getFetch();
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 1500) : null;

    let res: Response;
    try {
      res = await fetchFn(`${STT_API_URL}?action=quota`, {
        signal: controller ? controller.signal : undefined,
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (res.status === 429) {
      const err = await parseResponseError(res, '');
      if (err.isQuotaExceeded) {
        setQuotaCache('exceeded');
        return { engine: 'local', reason: 'quota_exceeded' };
      }
    }

    if (res.ok) {
      try {
        const data = await res.json();
        if (data && (data.code === CODE_QUOTA_EXCEEDED || data.available === false)) {
          const resetAt = typeof data.resetAt === 'number' ? data.resetAt : undefined;
          setQuotaCache('exceeded', { resetAt });
          return { engine: 'local', reason: 'quota_exceeded', resetAt };
        }
        setQuotaCache('available');
        return { engine: 'premium', reason: 'quota_available' };
      } catch {
        // Resposta não é JSON válido
      }
    }

    return { engine: 'premium', reason: 'unknown_assumed_premium' };
  } catch {
    return { engine: 'premium', reason: 'unknown_assumed_premium' };
  }
}

async function parseResponseError(res: Response, defaultMsg: string): Promise<TranscriptionError> {
  let message = defaultMsg;
  let code: string | undefined;

  try {
    const cloned = typeof res.clone === 'function' ? res.clone() : res;
    const data = await cloned.json();
    if (data && typeof data === 'object') {
      if (typeof data.code === 'string') {
        code = data.code;
      }
      if (typeof data.error === 'string') {
        message = data.error;
      } else if (typeof data.message === 'string') {
        message = data.message;
      }
    }
  } catch {
    // Resposta não é JSON válido: preserva defaultMsg
  }

  return new TranscriptionError(message, { status: res.status, code });
}

async function checkQuotaExceededResponse(res: Response): Promise<boolean> {
  if (res.status === 429) {
    const err = await parseResponseError(res, '');
    return err.isQuotaExceeded;
  }
  return false;
}

async function handleQuotaExceededFallback(
  audioUri: string,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<string> {
  setQuotaCache('exceeded');
  const localRecognizer = activeDependencies.localRecognizer;
  if (!localRecognizer) {
    throw new TranscriptionError(
      'Limite de transcrições premium atingido para este período e nenhum motor de reconhecimento local está disponível.',
      { status: 429, code: CODE_QUOTA_EXCEEDED }
    );
  }

  onProgress?.({
    status: 'local',
    message: 'Cota de transcrição na nuvem atingida. Transcrevendo no aparelho...',
  });

  return await localRecognizer.transcribeAudioFile(audioUri, onProgress);
}

/**
 * Inspeciona o arquivo de áudio para verificar existência e tamanho em bytes.
 */
async function inspectAudioFile(uri: string): Promise<{ exists: boolean; size: number }> {
  // 1. Tenta classe File (modern expo-file-system)
  try {
    const { File } = require('expo-file-system');
    if (File) {
      const f = new File(uri);
      if (f.exists) {
        return { exists: true, size: f.size || 0 };
      }
    }
  } catch {}

  // 2. Tenta FileSystem legacy (expo-file-system/legacy)
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.getInfoAsync === 'function') {
      const info = await FileSystemLegacy.getInfoAsync(uri);
      return { exists: !!info.exists, size: info.size || 0 };
    }
  } catch {}

  return { exists: true, size: 1024 }; // Fallback otimista se os módulos de filesystem não estiverem prontos
}

/**
 * Realiza o upload binário do arquivo de áudio para o Cloudflare R2 via Presigned PUT URL.
 * Suporta 4 estratégias em cascata para compatibilidade universal entre Expo SDKs e ambientes nativos.
 */
async function uploadToR2(audioUri: string, uploadUrl: string): Promise<boolean> {
  const isM4a = audioUri.toLowerCase().includes('.m4a');
  const contentType = isM4a ? 'audio/mp4' : 'audio/webm';

  // ─── ESTRATÉGIA 1: expo-file-system/legacy uploadAsync (Streaming nativo de disco) ───
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.uploadAsync === 'function') {
      const uploadRes = await FileSystemLegacy.uploadAsync(uploadUrl, audioUri, {
        httpMethod: 'PUT',
        uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (uploadRes.status >= 200 && uploadRes.status < 300) {
        return true;
      }
    }
  } catch {}

  // ─── ESTRATÉGIA 2: modern expo-file-system File.upload ───
  try {
    const { File, UploadType } = require('expo-file-system');
    if (File) {
      const file = new File(audioUri);
      if (typeof file.upload === 'function') {
        const uploadRes = await file.upload(uploadUrl, {
          httpMethod: 'PUT',
          uploadType: UploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': contentType,
          },
        });

        if (uploadRes.status >= 200 && uploadRes.status < 300) {
          return true;
        }
      }
    }
  } catch {}

  // ─── ESTRATÉGIA 3: file.bytes() Uint8Array streaming via fetch ───
  try {
    const { File } = require('expo-file-system');
    if (File) {
      const file = new File(audioUri);
      if (typeof file.bytes === 'function') {
        const bytes = await file.bytes();
        if (bytes && bytes.length > 50) {
          const res = await getFetch()(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': contentType,
            },
            body: bytes,
          });

          if (res.ok) {
            return true;
          }
        }
      }
    }
  } catch {}

  // ─── ESTRATÉGIA 4: Base64 via legacy FileSystem convertido para Uint8Array ───
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.readAsStringAsync === 'function') {
      const b64 = await FileSystemLegacy.readAsStringAsync(audioUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      if (b64 && b64.length > 50) {
        const binStr = atob(b64);
        const len = binStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }

        const res = await getFetch()(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
          body: bytes,
        });

        if (res.ok) {
          return true;
        }
      }
    }
  } catch {}

  return false;
}

/**
 * Fallback de contingência: Envia áudio binário diretamente para a rota proxy /api/stt.
 */
async function uploadDirectToSTT(audioUri: string, endpoint: string): Promise<string> {
  const isM4a = audioUri.toLowerCase().includes('.m4a');
  const contentType = isM4a ? 'audio/mp4' : 'audio/webm';

  // Tentativa 1: legacy uploadAsync POST
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.uploadAsync === 'function') {
      const res = await FileSystemLegacy.uploadAsync(endpoint, audioUri, {
        httpMethod: 'POST',
        uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });
      if (res.status >= 200 && res.status < 300 && res.body) {
        const data = JSON.parse(res.body);
        if (data.id) return data.id;
      }
      if (res.status === 429 && res.body) {
        try {
          const data = JSON.parse(res.body);
          if (data.code === CODE_QUOTA_EXCEEDED) {
            throw new TranscriptionError(data.error || 'quota_exceeded', {
              status: 429,
              code: CODE_QUOTA_EXCEEDED,
            });
          }
        } catch (parseErr) {
          if (parseErr instanceof TranscriptionError) throw parseErr;
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof TranscriptionError) throw err;
  }

  // Tentativa 2: file.bytes() -> fetch POST
  try {
    const { File } = require('expo-file-system');
    if (File) {
      const file = new File(audioUri);
      if (typeof file.bytes === 'function') {
        const bytes = await file.bytes();
        if (bytes && bytes.length > 50) {
          const res = await getFetch()(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': contentType },
            body: bytes,
          });
          if (await checkQuotaExceededResponse(res)) {
            throw await parseResponseError(res, 'Cota de transcrições premium atingida.');
          }
          if (res.ok) {
            const data = await res.json();
            if (data.id) return data.id;
          }
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof TranscriptionError) throw err;
  }

  throw new Error('Não foi possível enviar o áudio gravado para o serviço de transcrição.');
}

/**
 * Faz o upload de um arquivo de áudio para o Cloudflare R2 e processa transcrição segura.
 */
export async function transcribeAudioUri(
  audioUri: string,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<string> {
  try {
    // 1. Verifica conectividade antes de qualquer requisição de rede
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      onProgress?.({
        status: 'local',
        message: 'Sem conexão com a internet. Transcrevendo no aparelho...',
      });
      return await handleQuotaExceededFallback(audioUri, onProgress);
    }

    onProgress?.({
      status: 'uploading',
      message: 'Enviando áudio com fidelidade...',
    });

    let transcriptId: string | null = null;
    const fetchFn = getFetch();

    // Se o áudio já for uma URL remota pública
    if (audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
      const submitRes = await fetchFn(STT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: audioUri }),
      });

      if (await checkQuotaExceededResponse(submitRes)) {
        return await handleQuotaExceededFallback(audioUri, onProgress);
      }

      if (!submitRes.ok) {
        throw await parseResponseError(submitRes, `Erro ${submitRes.status} no serviço de transcrição.`);
      }

      const submitData = await submitRes.json();
      transcriptId = submitData.id || null;
    } else {
      // Inspeciona o arquivo local antes do upload
      let fileInfo = await inspectAudioFile(audioUri);
      if (!fileInfo.exists || fileInfo.size < 200) {
        await new Promise((r) => setTimeout(r, 300));
        fileInfo = await inspectAudioFile(audioUri);
      }

      if (!fileInfo.exists || fileInfo.size < 200) {
        throw new Error('O microfone não capturou áudio suficiente ou o arquivo está vazio. Fale mais próximo ao aparelho.');
      }

      // Caminho Primário: Cloudflare R2 Presigned PUT
      try {
        const urlRes = await fetchFn(`${STT_API_URL}?action=upload-url`);

        if (await checkQuotaExceededResponse(urlRes)) {
          return await handleQuotaExceededFallback(audioUri, onProgress);
        }

        if (urlRes.ok) {
          const { uploadUrl, audioUrl } = await urlRes.json();
          if (uploadUrl && audioUrl) {
            const uploader = activeDependencies.uploader || uploadToR2;
            const r2Uploaded = await uploader(audioUri, uploadUrl);
            if (r2Uploaded) {
              const submitRes = await fetchFn(STT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl }),
              });

              if (await checkQuotaExceededResponse(submitRes)) {
                return await handleQuotaExceededFallback(audioUri, onProgress);
              }

              if (submitRes.ok) {
                const submitData = await submitRes.json();
                transcriptId = submitData.id || null;
              } else {
                throw await parseResponseError(submitRes, `Erro ${submitRes.status} no envio para transcrição.`);
              }
            }
          }
        } else if (urlRes.status >= 500) {
          throw await parseResponseError(urlRes, `Erro ${urlRes.status} no servidor de transcrição.`);
        } else if (urlRes.status === 429) {
          throw await parseResponseError(urlRes, 'Muitas requisições (429).');
        }
      } catch (r2Err: unknown) {
        if (r2Err instanceof TranscriptionError) {
          throw r2Err;
        }
        console.warn('[Memorial Voice] Falha ao enviar para R2 presigned, usando contingência direta:', r2Err);
      }

      // Caminho de Contingência: Upload direto ao STT proxy
      if (!transcriptId) {
        try {
          transcriptId = await uploadDirectToSTT(audioUri, STT_API_URL);
        } catch (directErr: unknown) {
          if (directErr instanceof TranscriptionError && directErr.isQuotaExceeded) {
            return await handleQuotaExceededFallback(audioUri, onProgress);
          }
          throw directErr;
        }
      }
    }

    if (!transcriptId) {
      throw new Error('O serviço de transcrição não retornou um identificador de processamento válido.');
    }

    // ─── Polling do status da transcrição ───
    onProgress?.({
      status: 'transcribing',
      message: 'Transcrevendo relato em português...',
    });

    const startTime = Date.now();
    const maxWaitMs = 35000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 1000));

      const pollRes = await fetchFn(`${STT_API_URL}?id=${encodeURIComponent(transcriptId)}`);

      if (await checkQuotaExceededResponse(pollRes)) {
        return await handleQuotaExceededFallback(audioUri, onProgress);
      }

      if (!pollRes.ok) {
        // Falha transitória no polling (5xx ou 429 sem quota_exceeded): continua tentando até maxWaitMs
        continue;
      }

      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        const finalText = (pollData.text || '').trim();
        setQuotaCache('available');
        onProgress?.({
          status: 'completed',
          message: 'Transcrição concluída com sucesso.',
        });
        if (!finalText) {
          throw new Error('Nenhuma fala audível detectada. Tente falar um pouco mais alto ou próximo ao microfone.');
        }
        return finalText;
      }

      if (pollData.status === 'error') {
        throw new Error(pollData.error || 'Erro durante o processamento da transcrição.');
      }
    }

    throw new Error('Tempo limite excedido aguardando a transcrição da voz.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro durante a transcrição.';
    onProgress?.({
      status: 'error',
      message,
    });
    throw err;
  }
}
