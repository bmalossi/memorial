import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  createOnDeviceSpeechRecognizer,
  OnDeviceSpeechModuleLike,
} from '../src/lib/onDeviceSpeechService';

describe('On-Device Speech Recognition Service (expo-speech-recognition pt-BR)', () => {
  let mockModule: OnDeviceSpeechModuleLike;
  let listeners: Record<string, ((...args: any[]) => void)[]> = {};

  beforeEach(() => {
    listeners = {};
    mockModule = {
      isRecognitionAvailable: async () => true,
      getPermissionsAsync: async () => ({ granted: true, status: 'granted' } as any),
      requestPermissionsAsync: async () => ({ granted: true, status: 'granted' } as any),
      start: async (options: any) => {
        (mockModule as any).lastStartOptions = options;
      },
      stop: async () => {},
      abort: async () => {},
      addListener: (event: string, callback: (...args: any[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        return {
          remove: () => {
            listeners[event] = listeners[event].filter((cb) => cb !== callback);
          },
        };
      },
    };
  });

  it('deve verificar disponibilidade e permissões ao checar isAvailable', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);
    const available = await recognizer.isAvailable();
    assert.strictEqual(available, true);

    // Se o módulo não tiver reconhecimento disponível
    mockModule.isRecognitionAvailable = async () => false;
    const notAvailable = await recognizer.isAvailable();
    assert.strictEqual(notAvailable, false);
  });

  it('deve iniciar reconhecimento forçando pt-BR e exclusivamente on-device', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    let partialReceived = '';
    await recognizer.start({
      onPartialResult: (text) => {
        partialReceived = text;
      },
    });

    const startOptions = (mockModule as any).lastStartOptions;
    assert.strictEqual(startOptions.lang, 'pt-BR');
    assert.strictEqual(startOptions.requiresOnDeviceRecognition, true, 'Deve forçar processamento 100% no aparelho');
    assert.strictEqual(startOptions.interimResults, true);

    // Emite resultado parcial do evento nativo
    listeners['result']?.forEach((cb) =>
      cb({
        isFinal: false,
        results: [{ transcript: 'Senhor meu Deus' }],
      })
    );

    assert.strictEqual(partialReceived, 'Senhor meu Deus');

    // Ao chamar stop(), deve finalizar e retornar o texto
    listeners['result']?.forEach((cb) =>
      cb({
        isFinal: true,
        results: [{ transcript: 'Senhor meu Deus, em Ti confio.' }],
      })
    );

    const finalText = await recognizer.stop();
    assert.strictEqual(finalText, 'Senhor meu Deus, em Ti confio.');
  });

  it('deve permitir cancelar a captura limpando o estado sem lançar erro', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    let aborted = false;
    mockModule.abort = async () => {
      aborted = true;
    };

    await recognizer.start();
    await recognizer.cancel();

    assert.strictEqual(aborted, true);
  });

  it('deve transcrever um arquivo de áudio local usando audioSource on-device', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    mockModule.start = async (options: any) => {
      (mockModule as any).lastStartOptions = options;
      // Simula resultado emitido pelo recognizer nativo para o arquivo
      setTimeout(() => {
        listeners['result']?.forEach((cb) =>
          cb({
            isFinal: true,
            results: [{ transcript: 'Oração transcrita do arquivo gravado.' }],
          })
        );
      }, 10);
    };

    const text = await recognizer.transcribeAudioFile('file:///gravacao_local.m4a');

    const startOptions = (mockModule as any).lastStartOptions;
    assert.strictEqual(startOptions.lang, 'pt-BR');
    assert.strictEqual(startOptions.requiresOnDeviceRecognition, true);
    assert.strictEqual(startOptions.audioSource?.uri, 'file:///gravacao_local.m4a');
    assert.strictEqual(text, 'Oração transcrita do arquivo gravado.');
  });

  it('deve solicitar permissão acolhedora caso ainda não esteja concedida', async () => {
    let permissionRequested = false;
    mockModule.getPermissionsAsync = async () => ({ granted: false, status: 'undetermined' } as any);
    mockModule.requestPermissionsAsync = async () => {
      permissionRequested = true;
      return { granted: true, status: 'granted' } as any;
    };

    const recognizer = createOnDeviceSpeechRecognizer(mockModule);
    await recognizer.start();

    assert.strictEqual(permissionRequested, true);
  });

  it('deve lançar erro acolhedor com opção de Ajustes se o Leitor negar a permissão de reconhecimento', async () => {
    mockModule.getPermissionsAsync = async () => ({ granted: false, status: 'denied' } as any);
    mockModule.requestPermissionsAsync = async () => ({ granted: false, status: 'denied' } as any);

    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    await assert.rejects(
      async () => {
        await recognizer.start();
      },
      (err: any) => {
        return (
          err.code === 'permission_denied' &&
          err.canOpenSettings === true &&
          err.message.includes('Ajustes')
        );
      }
    );
  });

  it('deve categorizar ausência do pacote pt-BR com código language_pack_missing e opção de Ajustes', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    mockModule.start = async () => {
      throw { error: 'language-not-supported', message: 'Language pack pt-BR is missing for on-device recognition' };
    };

    await assert.rejects(
      async () => {
        await recognizer.start();
      },
      (err: any) => {
        return (
          err.code === 'language_pack_missing' &&
          err.canOpenSettings === true &&
          err.message.includes('português (pt-BR)')
        );
      }
    );
  });

  it('deve lançar erro acolhedor de nenhuma fala audível se o Leitor parar sem ter falado', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);
    await recognizer.start();

    // Chama stop() sem nenhum resultado emitido
    await assert.rejects(
      async () => {
        await recognizer.stop();
      },
      (err: any) => {
        return err.code === 'no_speech_detected' && err.message.includes('fala audível');
      }
    );
  });

  it('deve lançar erro acolhedor se o arquivo de áudio estiver sem fala audível', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);
    mockModule.start = async () => {
      setTimeout(() => {
        listeners['result']?.forEach((cb) =>
          cb({ isFinal: true, results: [{ transcript: '   ' }] })
        );
      }, 5);
    };

    await assert.rejects(
      async () => {
        await recognizer.transcribeAudioFile('file:///silencio.m4a');
      },
      (err: any) => {
        return err.code === 'no_speech_detected' && err.message.includes('fala audível');
      }
    );
  });

  it('deve tratar reconhecimento indisponível no aparelho de forma acolhedora', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(null);
    assert.strictEqual(await recognizer.isAvailable(), false);

    await assert.rejects(
      async () => {
        await recognizer.start();
      },
      (err: any) => {
        return err.code === 'recognition_unavailable' && err.message.includes('digitar');
      }
    );
  });

  it('deve categorizar interrupção do sistema (ligação, app em segundo plano) como interrupted sem travar', async () => {
    const recognizer = createOnDeviceSpeechRecognizer(mockModule);

    let capturedErr: any = null;
    await recognizer.start({
      onError: (err) => {
        capturedErr = err;
      },
    });

    listeners['error']?.forEach((cb) =>
      cb({ error: 'audio-interrupted', message: 'Audio session interrupted by phone call' })
    );

    assert.ok(capturedErr !== null);
    assert.strictEqual(capturedErr.code, 'interrupted');
    assert.ok(capturedErr.message.includes('interrupção'));
  });
});
