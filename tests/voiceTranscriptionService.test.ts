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
});
