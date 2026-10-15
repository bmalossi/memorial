/**
 * onDeviceSpeechService.ts — Bíblia Vive / Memorial
 *
 * Módulo de reconhecimento de voz nativo (on-device) em português (pt-BR).
 * Utiliza expo-speech-recognition com garantia de processamento exclusivamente
 * local (requiresOnDeviceRecognition: true), sem envio de áudio a servidores.
 */

import {
  LocalSpeechRecognizer,
  TranscriptionProgress,
  setLocalSpeechRecognizer,
} from './voiceTranscriptionService';

export type LocalSpeechErrorCode =
  | 'permission_denied'
  | 'language_pack_missing'
  | 'recognition_unavailable'
  | 'no_speech_detected'
  | 'interrupted'
  | 'unknown';

export class LocalSpeechError extends Error {
  readonly code: LocalSpeechErrorCode;
  readonly canOpenSettings: boolean;

  constructor(
    message: string,
    options: {
      code: LocalSpeechErrorCode;
      canOpenSettings?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'LocalSpeechError';
    this.code = options.code;
    this.canOpenSettings = !!options.canOpenSettings;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function categorizeSpeechError(err: any): LocalSpeechError {
  if (err instanceof LocalSpeechError) return err;

  const msg = (err?.message || err?.error || '').toLowerCase();
  const code = (err?.code || err?.error || '').toLowerCase();

  if (
    msg.includes('permission') ||
    msg.includes('permissão') ||
    code === 'insufficient-permissions' ||
    code === 'not-permitted' ||
    code === 'denied'
  ) {
    return new LocalSpeechError(
      'Para ditar suas memórias no aparelho, ative o microfone e o reconhecimento de voz nos Ajustes do sistema. Você também pode digitar seu relato diretamente.',
      { code: 'permission_denied', canOpenSettings: true, cause: err }
    );
  }

  if (
    msg.includes('language') ||
    msg.includes('model') ||
    msg.includes('pacote') ||
    msg.includes('offline') ||
    code === 'language-not-supported' ||
    code === 'language-unavailable'
  ) {
    return new LocalSpeechError(
      'O pacote de idioma em português (pt-BR) para reconhecimento offline não foi encontrado no aparelho. Baixe o pacote nos Ajustes ou digite seu relato.',
      { code: 'language_pack_missing', canOpenSettings: true, cause: err }
    );
  }

  if (
    msg.includes('no-speech') ||
    msg.includes('no_speech') ||
    msg.includes('no match') ||
    msg.includes('timeout') ||
    code === 'speech-timeout' ||
    code === 'no-match'
  ) {
    return new LocalSpeechError(
      'Nenhuma fala audível detectada. Tente falar um pouco mais alto ou próximo ao microfone.',
      { code: 'no_speech_detected', cause: err }
    );
  }

  if (
    msg.includes('interrupt') ||
    msg.includes('busy') ||
    msg.includes('ligação') ||
    code === 'interrupted' ||
    code === 'audio-interrupted'
  ) {
    return new LocalSpeechError(
      'A gravação de voz foi pausada por uma interrupção do aparelho.',
      { code: 'interrupted', cause: err }
    );
  }

  if (
    msg.includes('indisponível') ||
    msg.includes('unavailable') ||
    msg.includes('not available') ||
    code === 'recognition_unavailable'
  ) {
    return new LocalSpeechError(
      'O reconhecimento de voz local não está disponível neste dispositivo. Fique à vontade para digitar sua reflexão.',
      { code: 'recognition_unavailable', cause: err }
    );
  }

  return new LocalSpeechError(
    err?.message || 'Não foi possível concluir o reconhecimento de voz no aparelho. Você pode digitar seu relato.',
    { code: 'unknown', cause: err }
  );
}

export interface OnDeviceSpeechModuleLike {
  isRecognitionAvailable(): Promise<boolean>;
  getPermissionsAsync?(): Promise<{ granted: boolean; status?: string }>;
  requestPermissionsAsync?(): Promise<{ granted: boolean; status?: string }>;
  start(options: any): Promise<void>;
  stop(): Promise<void>;
  abort(): Promise<void>;
  addListener(event: string, callback: (...args: any[]) => void): { remove: () => void };
}

/**
 * Carrega dinamicamente o módulo nativo ExpoSpeechRecognitionModule se disponível.
 */
export function getNativeSpeechModule(): OnDeviceSpeechModuleLike | null {
  try {
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
    if (ExpoSpeechRecognitionModule) {
      return ExpoSpeechRecognitionModule;
    }
  } catch {}
  return null;
}

/**
 * Cria uma instância do reconhecedor local em conformidade com LocalSpeechRecognizer.
 */
export function createOnDeviceSpeechRecognizer(
  nativeModule: OnDeviceSpeechModuleLike | null = getNativeSpeechModule()
): LocalSpeechRecognizer {
  let activeListeners: { remove: () => void }[] = [];
  let currentTranscript = '';
  let activeResolve: ((value: string) => void) | null = null;
  let activeReject: ((reason?: any) => void) | null = null;

  const cleanupListeners = () => {
    activeListeners.forEach((sub) => sub.remove());
    activeListeners = [];
  };

  const ensurePermissions = async () => {
    if (!nativeModule) {
      throw new LocalSpeechError(
        'O reconhecimento de voz local não está disponível neste dispositivo. Fique à vontade para digitar sua reflexão.',
        { code: 'recognition_unavailable' }
      );
    }
    if (typeof nativeModule.getPermissionsAsync === 'function') {
      const current = await nativeModule.getPermissionsAsync();
      if (!current.granted && typeof nativeModule.requestPermissionsAsync === 'function') {
        const req = await nativeModule.requestPermissionsAsync();
        if (!req.granted) {
          throw new LocalSpeechError(
            'Para ditar suas memórias no aparelho, ative o microfone e o reconhecimento de voz nos Ajustes do sistema. Você também pode digitar seu relato diretamente.',
            { code: 'permission_denied', canOpenSettings: true }
          );
        }
      } else if (!current.granted && typeof nativeModule.requestPermissionsAsync !== 'function') {
        throw new LocalSpeechError(
          'Para ditar suas memórias no aparelho, ative o microfone e o reconhecimento de voz nos Ajustes do sistema. Você também pode digitar seu relato diretamente.',
          { code: 'permission_denied', canOpenSettings: true }
        );
      }
    }
  };

  return {
    async isAvailable(): Promise<boolean> {
      if (!nativeModule || typeof nativeModule.isRecognitionAvailable !== 'function') {
        return false;
      }
      try {
        return await nativeModule.isRecognitionAvailable();
      } catch {
        return false;
      }
    },

    async start(callbacks?: { onPartialResult?: (text: string) => void; onError?: (err: any) => void }): Promise<void> {
      if (!nativeModule) {
        throw new LocalSpeechError(
          'O reconhecimento de voz local não está disponível neste dispositivo. Fique à vontade para digitar sua reflexão.',
          { code: 'recognition_unavailable' }
        );
      }

      await ensurePermissions();

      cleanupListeners();
      currentTranscript = '';

      const resultSub = nativeModule.addListener('result', (event: any) => {
        const text = event.results?.[0]?.transcript || '';
        if (text) {
          currentTranscript = text;
          if (!event.isFinal) {
            callbacks?.onPartialResult?.(text);
          } else if (activeResolve) {
            activeResolve(text);
            activeResolve = null;
          }
        }
      });

      const errorSub = nativeModule.addListener('error', (event: any) => {
        const err = categorizeSpeechError(event);
        callbacks?.onError?.(err);
        if (activeReject) {
          activeReject(err);
          activeReject = null;
        }
      });

      activeListeners.push(resultSub, errorSub);

      try {
        await nativeModule.start({
          lang: 'pt-BR',
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: true,
          addsPunctuation: true,
        });
      } catch (startErr) {
        cleanupListeners();
        throw categorizeSpeechError(startErr);
      }
    },

    async stop(): Promise<string> {
      if (!nativeModule) return currentTranscript;

      try {
        await nativeModule.stop();
      } catch {}

      cleanupListeners();

      if (!currentTranscript.trim()) {
        throw new LocalSpeechError(
          'Nenhuma fala audível detectada. Tente falar um pouco mais alto ou próximo ao microfone.',
          { code: 'no_speech_detected' }
        );
      }

      return currentTranscript;
    },

    async cancel(): Promise<void> {
      if (!nativeModule) return;

      try {
        await nativeModule.abort();
      } catch {}

      cleanupListeners();
      currentTranscript = '';
    },

    async transcribeAudioFile(
      audioUri: string,
      onProgress?: (p: TranscriptionProgress) => void
    ): Promise<string> {
      if (!nativeModule) {
        throw new LocalSpeechError(
          'O reconhecimento de voz local não está disponível neste dispositivo. Fique à vontade para digitar sua reflexão.',
          { code: 'recognition_unavailable' }
        );
      }

      await ensurePermissions();

      onProgress?.({
        status: 'local',
        message: 'Processando áudio diretamente no aparelho (pt-BR)...',
      });

      return new Promise<string>(async (resolve, reject) => {
        cleanupListeners();
        let fileTranscript = '';

        activeResolve = resolve;
        activeReject = reject;

        const resultSub = nativeModule.addListener('result', (event: any) => {
          const text = event.results?.[0]?.transcript || '';
          if (text) {
            fileTranscript = text;
          }
          if (event.isFinal) {
            cleanupListeners();
            if (!fileTranscript.trim()) {
              reject(
                new LocalSpeechError(
                  'Nenhuma fala audível detectada no áudio gravado. Tente falar um pouco mais próximo ao microfone.',
                  { code: 'no_speech_detected' }
                )
              );
            } else {
              resolve(fileTranscript);
            }
          }
        });

        const errorSub = nativeModule.addListener('error', (event: any) => {
          cleanupListeners();
          reject(categorizeSpeechError(event));
        });

        activeListeners.push(resultSub, errorSub);

        try {
          await nativeModule.start({
            lang: 'pt-BR',
            requiresOnDeviceRecognition: true,
            audioSource: { uri: audioUri },
          });
        } catch (startErr) {
          cleanupListeners();
          reject(categorizeSpeechError(startErr));
        }
      });
    },
  };
}

// Instância padrão do reconhecedor de voz no aparelho
export const defaultOnDeviceSpeechRecognizer = createOnDeviceSpeechRecognizer();

// Registra como implementação local padrão no serviço de transcrição
setLocalSpeechRecognizer(defaultOnDeviceSpeechRecognizer);
