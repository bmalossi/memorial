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
      throw new Error('Reconhecimento de voz no aparelho não está disponível neste dispositivo.');
    }
    if (typeof nativeModule.getPermissionsAsync === 'function') {
      const current = await nativeModule.getPermissionsAsync();
      if (!current.granted && typeof nativeModule.requestPermissionsAsync === 'function') {
        const req = await nativeModule.requestPermissionsAsync();
        if (!req.granted) {
          throw new Error('O Memorial precisa de permissão de microfone e reconhecimento de voz para capturar suas reflexões.');
        }
      } else if (!current.granted && typeof nativeModule.requestPermissionsAsync !== 'function') {
        throw new Error('Permissão de microfone ou reconhecimento de voz não concedida.');
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

    async start(callbacks?: { onPartialResult?: (text: string) => void }): Promise<void> {
      if (!nativeModule) {
        throw new Error('Módulo de reconhecimento de voz local indisponível.');
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
        const errMessage = event?.message || 'Falha no reconhecimento de voz local.';
        if (activeReject) {
          activeReject(new Error(errMessage));
          activeReject = null;
        }
      });

      activeListeners.push(resultSub, errorSub);

      await nativeModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,
      });
    },

    async stop(): Promise<string> {
      if (!nativeModule) return currentTranscript;

      try {
        await nativeModule.stop();
      } catch {}

      cleanupListeners();
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
        throw new Error('Reconhecimento de voz local indisponível para transcrever arquivo.');
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
            resolve(fileTranscript);
          }
        });

        const errorSub = nativeModule.addListener('error', (event: any) => {
          cleanupListeners();
          reject(new Error(event?.message || 'Falha ao transcrever arquivo de áudio localmente.'));
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
          reject(startErr);
        }
      });
    },
  };
}

// Instância padrão do reconhecedor de voz no aparelho
export const defaultOnDeviceSpeechRecognizer = createOnDeviceSpeechRecognizer();

// Registra como implementação local padrão no serviço de transcrição
setLocalSpeechRecognizer(defaultOnDeviceSpeechRecognizer);
