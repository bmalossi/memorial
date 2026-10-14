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

export interface TranscriptionProgress {
  status: 'uploading' | 'transcribing' | 'completed' | 'local' | 'error';
  message: string;
}

export interface LocalSpeechRecognizer {
  isAvailable(): Promise<boolean>;
  start(callbacks?: { onPartialResult?: (text: string) => void }): Promise<void>;
  stop(): Promise<string>;
  cancel(): Promise<void>;
  transcribeAudioFile(audioUri: string, onProgress?: (p: TranscriptionProgress) => void): Promise<string>;
}

export interface TranscriptionServiceDependencies {
  fetchFn?: typeof fetch;
  localRecognizer?: LocalSpeechRecognizer;
  uploader?: (audioUri: string, uploadUrl: string) => Promise<boolean>;
}

let activeDependencies: TranscriptionServiceDependencies = {};

export function setTranscriptionDependencies(deps: Partial<TranscriptionServiceDependencies>): void {
  activeDependencies = { ...activeDependencies, ...deps };
}

export function setLocalSpeechRecognizer(recognizer: LocalSpeechRecognizer): void {
  activeDependencies.localRecognizer = recognizer;
}

export function resetTranscriptionDependencies(): void {
  activeDependencies = {};
}

function getFetch(): typeof fetch {
  return activeDependencies.fetchFn || fetch;
}

async function checkQuotaExceededResponse(res: Response): Promise<boolean> {
  if (res.status === 429) {
    try {
      const cloned = typeof res.clone === 'function' ? res.clone() : res;
      const data = await cloned.json();
      if (data && data.code === 'quota_exceeded') {
        return true;
      }
    } catch {}
  }
  return false;
}

async function extractErrorMessage(res: Response, defaultMsg: string): Promise<string> {
  try {
    const cloned = typeof res.clone === 'function' ? res.clone() : res;
    const data = await cloned.json();
    return data.error || data.message || (data.code ? `[${data.code}] ${defaultMsg}` : defaultMsg);
  } catch {
    return defaultMsg;
  }
}

async function handleQuotaExceededFallback(
  audioUri: string,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<string> {
  const localRecognizer = activeDependencies.localRecognizer;
  if (!localRecognizer) {
    throw new Error('Limite de transcrições premium atingido para este período e nenhum motor de reconhecimento local está disponível.');
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
        const data = JSON.parse(res.body);
        if (data.code === 'quota_exceeded') {
          const err: any = new Error('quota_exceeded');
          err.code = 'quota_exceeded';
          throw err;
        }
      }
    }
  } catch (err: any) {
    if (err.code === 'quota_exceeded') throw err;
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
            const err: any = new Error('quota_exceeded');
            err.code = 'quota_exceeded';
            throw err;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.id) return data.id;
          }
        }
      }
    }
  } catch (err: any) {
    if (err.code === 'quota_exceeded') throw err;
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
        const errorMsg = await extractErrorMessage(submitRes, `Erro ${submitRes.status} no serviço de transcrição.`);
        throw new Error(errorMsg);
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
                const errorMsg = await extractErrorMessage(submitRes, `Erro ${submitRes.status} no envio para transcrição.`);
                throw new Error(errorMsg);
              }
            }
          }
        } else if (urlRes.status >= 500) {
          const errorMsg = await extractErrorMessage(urlRes, `Erro ${urlRes.status} no servidor de transcrição.`);
          throw new Error(errorMsg);
        } else if (urlRes.status === 429) {
          const errorMsg = await extractErrorMessage(urlRes, 'Muitas requisições (429).');
          throw new Error(errorMsg);
        }
      } catch (r2Err: any) {
        if (
          r2Err.code === 'quota_exceeded' ||
          r2Err.message?.includes('quota_exceeded') ||
          r2Err.status >= 500 ||
          r2Err.status === 429 ||
          r2Err.message?.includes('Erro 5')
        ) {
          throw r2Err;
        }
        console.warn('[Memorial Voice] Falha ao enviar para R2 presigned, usando contingência direta:', r2Err);
      }

      // Caminho de Contingência: Upload direto ao STT proxy
      if (!transcriptId) {
        try {
          transcriptId = await uploadDirectToSTT(audioUri, STT_API_URL);
        } catch (directErr: any) {
          if (directErr.code === 'quota_exceeded') {
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
        if (pollRes.status >= 500) {
          const errorMsg = await extractErrorMessage(pollRes, `Erro ${pollRes.status} ao consultar status da transcrição.`);
          throw new Error(errorMsg);
        }
        if (pollRes.status === 429) {
          const errorMsg = await extractErrorMessage(pollRes, 'Muitas requisições (429).');
          throw new Error(errorMsg);
        }
        continue;
      }

      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        const finalText = (pollData.text || '').trim();
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
  } catch (err: any) {
    onProgress?.({
      status: 'error',
      message: err.message || 'Erro durante a transcrição.',
    });
    throw err;
  }
}
