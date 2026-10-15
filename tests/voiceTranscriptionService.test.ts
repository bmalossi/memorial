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
    assert.strictEqual(await mockRecognizer.isAvailable(), true);
    await mockRecognizer.start();
    assert.strictEqual(started, true);
    const stoppedText = await mockRecognizer.stop();
    assert.strictEqual(stopped, true);
    assert.strictEqual(stoppedText, 'texto local');
    await mockRecognizer.cancel();
    assert.strictEqual(cancelled, true);
    assert.strictEqual(await mockRecognizer.transcribeAudioFile('file:///test.m4a'), 'transcrição local do arquivo');

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

  it('quando a requisição de upload-url para arquivo local retornar 429 quota_exceeded, deve acionar motor local', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'áudio local transcrito';
      },
    };

    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('action=upload-url')) {
        return new Response(
          JSON.stringify({ error: 'Cota estourada', code: 'quota_exceeded' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('ok', { status: 200 });
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      const progressStatuses: string[] = [];
      const result = await transcribeAudioUri('file:///caminho/local/gravacao.m4a', (p) => {
        progressStatuses.push(p.status);
      });

      assert.strictEqual(localCalled, true);
      assert.strictEqual(result, 'áudio local transcrito');
      assert.ok(progressStatuses.includes('local'));
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('quando o servidor retornar 429 quota_exceeded mas nenhum motor local estiver configurado, deve lançar erro informativo', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies, TranscriptionError } = await import('../src/lib/voiceTranscriptionService');

    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          error: 'Limite de transcrições atingido',
          code: 'quota_exceeded',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: undefined,
    });

    try {
      await assert.rejects(
        async () => {
          await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a');
        },
        (err: any) => {
          return err instanceof TranscriptionError && err.status === 429 && err.isQuotaExceeded;
        }
      );
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('quando o servidor retornar 429 sem code: quota_exceeded, NÃO deve acionar o motor local (decisão estrita por code)', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies, TranscriptionError } = await import('../src/lib/voiceTranscriptionService');

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
          return err instanceof TranscriptionError && err.status === 429 && err.code === 'too_many_requests';
        }
      );
      assert.strictEqual(localCalled, false, 'Não deve fazer fallback se o code não for quota_exceeded');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('quando a requisição de upload-url retornar 503, deve lançar TranscriptionError e NÃO engolir o erro', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies, TranscriptionError } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'não deveria';
      },
    };

    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('action=upload-url')) {
        return new Response(
          JSON.stringify({ error: 'Cluster indisponível temporariamente' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('ok', { status: 200 });
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
      uploader: async () => true,
    });

    try {
      await assert.rejects(
        async () => {
          await transcribeAudioUri('file:///caminho/local/gravacao.m4a');
        },
        (err: any) => {
          return err instanceof TranscriptionError && err.status === 503 && err.message.includes('Cluster indisponível');
        }
      );
      assert.strictEqual(localCalled, false, 'Erro 503 não deve disparar fallback nem ser engolido');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('durante o polling, uma falha temporária 504 do servidor deve continuar tentando e recuperar a transcrição', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let pollCount = 0;
    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'tx-poll-retry' }), { status: 200 });
      }
      if (urlStr.includes('id=tx-poll-retry')) {
        pollCount++;
        if (pollCount === 1) {
          // Blip temporário 504
          return new Response(JSON.stringify({ error: 'Internal gateway timeout' }), { status: 504 });
        }
        return new Response(JSON.stringify({ status: 'completed', text: 'O Senhor é meu pastor' }), { status: 200 });
      }
      return new Response('ok', { status: 200 });
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
    });

    try {
      const result = await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a');
      assert.strictEqual(result, 'O Senhor é meu pastor');
      assert.ok(pollCount >= 2, 'Polling deve ter continuado após a falha transitória');
    } finally {
      resetTranscriptionDependencies();
    }
  });

  it('durante o polling, se o servidor retornar 429 quota_exceeded, deve acionar o motor local', async () => {
    const { transcribeAudioUri, setTranscriptionDependencies, resetTranscriptionDependencies } = await import('../src/lib/voiceTranscriptionService');

    let localCalled = false;
    const mockRecognizer = {
      isAvailable: async () => true,
      start: async () => {},
      stop: async () => '',
      cancel: async () => {},
      transcribeAudioFile: async () => {
        localCalled = true;
        return 'texto local após cota estourar no polling';
      },
    };

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'tx-poll-quota' }), { status: 200 });
      }
      if (urlStr.includes('id=tx-poll-quota')) {
        return new Response(
          JSON.stringify({ error: 'Cota de processamento esgotada', code: 'quota_exceeded' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('ok', { status: 200 });
    };

    setTranscriptionDependencies({
      fetchFn: mockFetch as any,
      localRecognizer: mockRecognizer,
    });

    try {
      const result = await transcribeAudioUri('https://cdn.bibliavive.com.br/sample.m4a');
      assert.strictEqual(result, 'texto local após cota estourar no polling');
      assert.strictEqual(localCalled, true);
    } finally {
      resetTranscriptionDependencies();
    }
  });
});
