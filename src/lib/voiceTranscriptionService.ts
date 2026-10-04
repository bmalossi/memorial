/**
 * voiceTranscriptionService.ts — Bíblia Vive / Memorial
 *
 * Módulo de gravação e transcrição de voz em alta fidelidade.
 * Integração canônica com AssemblyAI (Universal-3.5-pro / Universal-2) em pt-BR.
 */

import { Platform } from 'react-native';

const ASSEMBLYAI_API_KEY =
  process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY ||
  process.env.ASSEMBLYAI_API_KEY ||
  '';

export interface TranscriptionProgress {
  status: 'uploading' | 'transcribing' | 'completed' | 'error';
  message: string;
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
 * Realiza o upload binário resiliente do arquivo de áudio para a AssemblyAI.
 * Utiliza 4 estratégias em cascata para compatibilidade universal entre Expo SDKs e ambientes nativos.
 */
async function uploadAudioBinary(audioUri: string, apiKey: string): Promise<string> {
  const uploadEndpoint = 'https://api.assemblyai.com/v2/upload';

  // ─── ESTRATÉGIA 1: expo-file-system/legacy uploadAsync (Streaming nativo de disco) ───
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.uploadAsync === 'function') {
      console.log('[Memorial Voice] Tentando upload via expo-file-system/legacy...');
      const uploadRes = await FileSystemLegacy.uploadAsync(
        uploadEndpoint,
        audioUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      if (uploadRes.status === 200 && uploadRes.body) {
        const parsed = JSON.parse(uploadRes.body);
        if (parsed.upload_url) {
          console.log('[Memorial Voice] Upload OK (legacy FileSystem):', parsed.upload_url);
          return parsed.upload_url;
        }
      } else {
        console.warn('[Memorial Voice] legacy uploadAsync status:', uploadRes.status);
      }
    }
  } catch (err) {
    console.log('[Memorial Voice] Falha na estratégia 1 (legacy):', err);
  }

  // ─── ESTRATÉGIA 2: modern expo-file-system File.upload ───
  try {
    const { File, UploadType } = require('expo-file-system');
    if (File) {
      console.log('[Memorial Voice] Tentando upload via modern File class...');
      const file = new File(audioUri);
      if (typeof file.upload === 'function') {
        const uploadRes = await file.upload(uploadEndpoint, {
          httpMethod: 'POST',
          uploadType: UploadType.BINARY_CONTENT,
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/octet-stream',
          },
        });

        if (uploadRes.status === 200 && uploadRes.body) {
          const parsed = JSON.parse(uploadRes.body);
          if (parsed.upload_url) {
            console.log('[Memorial Voice] Upload OK (modern File):', parsed.upload_url);
            return parsed.upload_url;
          }
        }
      }
    }
  } catch (err) {
    console.log('[Memorial Voice] Falha na estratégia 2 (modern File):', err);
  }

  // ─── ESTRATÉGIA 3: file.bytes() Uint8Array streaming via fetch ───
  try {
    const { File } = require('expo-file-system');
    if (File) {
      const file = new File(audioUri);
      if (typeof file.bytes === 'function') {
        console.log('[Memorial Voice] Lendo bytes via file.bytes()...');
        const bytes = await file.bytes();
        if (bytes && bytes.length > 50) {
          const res = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
              Authorization: apiKey,
              'Content-Type': 'application/octet-stream',
            },
            body: bytes,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.upload_url) {
              console.log('[Memorial Voice] Upload OK (bytes):', data.upload_url);
              return data.upload_url;
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('[Memorial Voice] Falha na estratégia 3 (bytes):', err);
  }

  // ─── ESTRATÉGIA 4: Base64 via expo-file-system/legacy convertido para Uint8Array ───
  try {
    const FileSystemLegacy = require('expo-file-system/legacy');
    if (FileSystemLegacy && typeof FileSystemLegacy.readAsStringAsync === 'function') {
      console.log('[Memorial Voice] Lendo base64 via legacy FileSystem...');
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

        const res = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: bytes,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.upload_url) {
            console.log('[Memorial Voice] Upload OK (base64 bytes):', data.upload_url);
            return data.upload_url;
          }
        }
      }
    }
  } catch (err) {
    console.log('[Memorial Voice] Falha na estratégia 4 (base64):', err);
  }

  throw new Error('Não foi possível enviar o arquivo de áudio gravado para a AssemblyAI.');
}

/**
 * Faz o upload de um arquivo de áudio (URI ou URL remota) para a AssemblyAI e aguarda a transcrição.
 */
export async function transcribeAudioUri(
  audioUri: string,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<string> {
  const apiKey = ASSEMBLYAI_API_KEY.trim();
  if (!apiKey) {
    throw new Error('Chave da AssemblyAI (EXPO_PUBLIC_ASSEMBLYAI_API_KEY) não configurada.');
  }

  try {
    onProgress?.({
      status: 'uploading',
      message: 'Enviando áudio com fidelidade...',
    });

    let uploadUrl = '';

    // Se o áudio já for uma URL remota (ex: teste/demonstração), usa diretamente
    if (audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
      uploadUrl = audioUri;
    } else {
      // Inspeciona o arquivo local antes de tentar upload
      let fileInfo = await inspectAudioFile(audioUri);
      console.log('[Memorial Voice] Verificação do arquivo de áudio:', fileInfo);

      if (!fileInfo.exists || fileInfo.size < 200) {
        // Aguarda 300ms caso o sistema de arquivos do Android ainda esteja finalizando o arquivo
        await new Promise((r) => setTimeout(r, 300));
        fileInfo = await inspectAudioFile(audioUri);
        console.log('[Memorial Voice] Re-verificação após espera:', fileInfo);
      }

      if (!fileInfo.exists || fileInfo.size < 200) {
        throw new Error('O microfone não capturou áudio suficiente ou o arquivo está vazio. Fale mais próximo ao aparelho.');
      }

      uploadUrl = await uploadAudioBinary(audioUri, apiKey);
    }

    if (!uploadUrl) {
      throw new Error('AssemblyAI não retornou URL de upload válida.');
    }

    // ─── Submissão do job de transcrição (POST /v2/transcript) ───
    onProgress?.({
      status: 'transcribing',
      message: 'Transcrevendo relato em português...',
    });

    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speech_models: ['universal-3-5-pro', 'universal-2'],
        language_code: 'pt',
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text().catch(() => '');
      throw new Error(`Falha ao iniciar transcrição (${transcriptRes.status}): ${errText}`);
    }

    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    if (!transcriptId) {
      throw new Error('AssemblyAI não retornou ID de transcrição.');
    }

    // ─── Polling do status até "completed" ou "error" (máx 30 segundos) ───
    const startTime = Date.now();
    const maxWaitMs = 30000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 1000));

      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
      });

      if (!pollRes.ok) {
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
        throw new Error(pollData.error || 'Erro desconhecido na transcrição da AssemblyAI.');
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

