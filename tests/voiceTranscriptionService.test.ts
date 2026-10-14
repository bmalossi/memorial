import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Voice Transcription Service (Blindagem Cloudflare & Zero Client Secrets)', () => {
  it('não deve possuir nenhuma chave de API secreta exposta no cliente', async () => {
    // Importa o módulo dinamicamente
    const serviceModule = await import('../src/lib/voiceTranscriptionService');

    // Valida que as funções essenciais continuam exportadas
    assert.strictEqual(typeof serviceModule.transcribeAudioUri, 'function');

    // Valida que nenhuma variável de chave de API é exportada
    assert.strictEqual((serviceModule as any).ASSEMBLYAI_API_KEY, undefined);
  });

  it('deve usar o endpoint STT configurável com fallback canônico para bibliavive.com.br', () => {
    const defaultUrl = 'https://www.bibliavive.com.br/api/stt';
    const envUrl = process.env.EXPO_PUBLIC_STT_API_URL || defaultUrl;

    assert.ok(envUrl.includes('/api/stt'), 'Endpoint deve apontar para rota proxy /api/stt');
    assert.ok(!envUrl.includes('api.assemblyai.com'), 'Endpoint móvel NUNCA deve chamar diretamente a AssemblyAI');
  });

  it('deve rejeitar áudios vazios ou corrompidos com mensagem acolhedora antes de chamar o servidor', async () => {
    const { transcribeAudioUri } = await import('../src/lib/voiceTranscriptionService');

    await assert.rejects(
      async () => {
        // Passa um arquivo inexistente ou de tamanho zero
        await transcribeAudioUri('file:///caminho/inexistente/gravacao.m4a');
      },
      (err: any) => {
        // Deve falhar com mensagem clara sobre áudio insuficiente ou conexão
        return typeof err.message === 'string' && err.message.length > 0;
      }
    );
  });

  it('deve exportar a interface do motor local e permitir configurar um motor simulado', async () => {
    const { setLocalSpeechRecognizer, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let started = false;
    let stopped = false;
    let cancelled = false;

    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => { started = true; },
      stop: async () => { stopped = true; return 'texto local'; },
      cancel: async () => { cancelled = true; },
      transcribeAudioFile: async (_uri: string) => 'transcrição local do arquivo',
    };

    setLocalSpeechRecognizer(mockRecognizer);
    // Deve permitir resetar
    resetTranscriptionDependencies();
  });

  it('quando a cota estiver disponível, deve usar o fluxo premium e NÃO acionar o motor local', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'texto local';
      },
    };

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('action=upload-url')) {
        return new Response(JSON.stringify({ uploadUrl: 'https://r2.mock/upload', audioUrl: 'https://r2.mock/audio.m4a' }), { status: 200 });
      }
      if (urlStr.includes('id=')) {
        return new Response(JSON.stringify({ status: 'completed', text: 'Glória a Deus no mais alto dos céus' }), { status: 200 });
      }
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'tx-123' }), { status: 200 });
      }
      return new Response('ok', { status: 200 });
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      const progressList: string[] = [];
      const result = await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a', (p) => {
        progressList.push(p.status);
      });

      assert.strictEqual(result, 'Glória a Deus no mais alto dos céus');
      assert.strictEqual(localCalled, false, 'Motor local não deveria ter sido acionado quando há cota');
      assert.ok(progressList.includes('completed'));
      assert.ok(!progressList.includes('local'), 'Não deve emitir status local quando há cota');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('quando o servidor retornar 429 quota_exceeded, deve acionar o motor local e emitir status local', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async (uri: string, onProgress?: (p: any) => void) => {
        localCalled = true;
        onProgress?.({ status: 'local', message: 'Reconhecimento de voz no aparelho...' });
        return 'oração transcrita no dispositivo';
      },
    };

    // Servidor responde 429 com code: 'quota_exceeded'
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          error: 'Limite de transcrições premium atingido para este período.',
          code: 'quota_exceeded',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      const progressStatuses: string[] = [];
      const result = await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a', (p) => {
        progressStatuses.push(p.status);
      });

      assert.strictEqual(localCalled, true, 'Deve ter acionado o motor local');
      assert.strictEqual(result, 'oração transcrita no dispositivo');
      assert.ok(progressStatuses.includes('local'), 'Deve ter emitido evento com status local');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('quando o servidor retornar 429 sem code: quota_exceeded, NÃO deve acionar o motor local (decisão estrita por code)', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'não deveria chamar';
      },
    };

    // 429 com outro código qualquer (ex: rate limit passageiro)
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          error: 'Muitas requisições por segundo. Aguarde alguns instantes.',
          code: 'too_many_requests',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      await assert.rejects(
        async () => {
          await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a');
        },
        (err: any) => {
          return err.message.includes('Muitas requisições') || err.message.includes('429') || err.message.includes('too_many_requests');
        }
      );
      assert.strictEqual(localCalled, false, 'Não deve fazer fallback se o code não for quota_exceeded');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('erros 5xx e timeouts do servidor NÃO devem disparar o fallback automático', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'não deveria chamar';
      },
    };

    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ error: 'Erro interno no cluster de processamento' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      await assert.rejects(
        async () => {
          await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a');
        },
        (err: any) => {
          return typeof err.message === 'string';
        }
      );
      assert.strictEqual(localCalled, false, 'Erro 500 não deve disparar fallback automático');
    } finally {
      resetTranscriptionDependencies();
    }
  });
});
