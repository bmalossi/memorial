/**
 * nativeAudioService.ts — Bíblia Vive / Memorial
 *
 * Gerenciador nativo de gravação de voz e ciclo de vida de áudio.
 * Projetado para compilação em Development Build (expo-dev-client / expo-audio).
 * Possui detecção defensiva de ambiente para garantir que não quebre se executado no Expo Go.
 */

import { Platform } from 'react-native';
import { transcribeAudioUri, TranscriptionProgress } from './voiceTranscriptionService';

export interface AudioRecordingState {
  isRecording: boolean;
  durationSeconds: number;
  uri: string | null;
}

// Interface de referência para o gravador nativo do expo-audio
interface NativeRecorderInstance {
  record: () => void;
  stop: () => Promise<any>;
  uri: string | null;
  currentTime?: number;
  prepareToRecordAsync?: (options?: any) => Promise<void>;
}

let activeRecorder: NativeRecorderInstance | null = null;
let recordingTimer: any = null;

/**
 * Cria opções de gravação otimizadas para voz humana (mono, alta clareza, AAC/m4a).
 * Garante que os campos de formato e encoder estejam no nível raiz para o Android e iOS.
 */
function getSpeechRecordingOptions() {
  const common = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 1, // Mono: ideal para modelos de voz (AssemblyAI / Universal-2)
    bitRate: 64000,
    isMeteringEnabled: false,
  };

  if (Platform.OS === 'android') {
    return {
      ...common,
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
      },
    };
  }

  if (Platform.OS === 'ios') {
    return {
      ...common,
      outputFormat: 'aac ',
      audioQuality: 96,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
      ios: {
        outputFormat: 'aac ',
        audioQuality: 96,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };
  }

  return {
    ...common,
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  };
}

/**
 * Verifica se o módulo nativo expo-audio está compilado e disponível no binário atual.
 */
export function isNativeAudioAvailable(): boolean {
  try {
    const expoAudio = require('expo-audio');
    return (
      !!expoAudio &&
      !!expoAudio.AudioModule &&
      typeof expoAudio.requestRecordingPermissionsAsync === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Solicita permissão de gravação de áudio do microfone.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { requestRecordingPermissionsAsync } = require('expo-audio');
    const { granted } = await requestRecordingPermissionsAsync();
    return !!granted;
  } catch {
    return false;
  }
}

/**
 * Inicia a gravação de áudio nativa em alta qualidade.
 */
export async function startNativeRecording(
  onTick?: (seconds: number) => void
): Promise<void> {
  if (!isNativeAudioAvailable()) {
    throw new Error('DEV_BUILD_REQUIRED');
  }

  const {
    AudioModule,
    setAudioModeAsync,
    requestRecordingPermissionsAsync,
  } = require('expo-audio');

  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) {
    throw new Error('PERMISSION_DENIED');
  }

  // Configura a sessão de áudio para permitir gravação com clareza
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  // Cria e inicia o gravador nativo com opções padronizadas para fala
  const options = getSpeechRecordingOptions();
  const recorder = new AudioModule.AudioRecorder(options);
  if (typeof recorder.prepareToRecordAsync === 'function') {
    await recorder.prepareToRecordAsync(options);
  }
  recorder.record();
  activeRecorder = recorder;

  let elapsed = 0;
  if (recordingTimer) clearInterval(recordingTimer);
  recordingTimer = setInterval(() => {
    elapsed += 1;
    onTick?.(elapsed);
  }, 1000);
}

/**
 * Para a gravação nativa e retorna a URI do arquivo .m4a gerado.
 */
export async function stopNativeRecording(): Promise<string> {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  if (!activeRecorder) {
    throw new Error('Nenhuma gravação ativa.');
  }

  const recorder = activeRecorder;
  activeRecorder = null;

  let stoppedUri: string | null = null;
  try {
    const stopResult: any = await recorder.stop();
    if (stopResult && typeof stopResult === 'object' && stopResult.url) {
      stoppedUri = stopResult.url;
    }
  } catch (err: any) {
    console.warn('[Memorial Voice] Erro ao parar gravador:', err);
  }

  // Restaura o modo de áudio padrão
  try {
    const { setAudioModeAsync } = require('expo-audio');
    await setAudioModeAsync({ allowsRecording: false });
  } catch {}

  const uri = stoppedUri || recorder.uri;
  console.log('[Memorial Voice] Gravação encerrada com URI:', uri);
  if (!uri) {
    throw new Error('O gravador nativo não gerou um arquivo de áudio acessível.');
  }

  // Breve delay de estabilização para o sistema operacional descarregar os buffers do arquivo
  await new Promise((resolve) => setTimeout(resolve, 200));

  return uri;
}

/**
 * Cancela a gravação em andamento sem transcrever.
 */
export async function cancelNativeRecording(): Promise<void> {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }

  if (activeRecorder) {
    try {
      await activeRecorder.stop();
    } catch {}
    activeRecorder = null;
  }

  try {
    const { setAudioModeAsync } = require('expo-audio');
    await setAudioModeAsync({ allowsRecording: false });
  } catch {}
}

/**
 * Para a gravação ativa e envia diretamente para transcrição com AssemblyAI.
 */
export async function stopAndTranscribe(
  onProgress?: (p: TranscriptionProgress) => void
): Promise<string> {
  const uri = await stopNativeRecording();
  return await transcribeAudioUri(uri, onProgress);
}

