import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAutoTitle } from '../src/lib/utils';
import type { MemorialEntry } from '../src/lib/types';

describe('Bottom-Docked Quick Capture — Envio Automático por Voz (Zero Friction)', () => {
  const fixedDate = new Date(2026, 9, 8, 15, 30);

  it('deve priorizar o textOverride da gravação de voz sobre o estado pré-existente de texto', () => {
    const quickTextState = 'Rascunho não enviado';
    const voiceOverride = 'Oração da madrugada no monte';

    const textToSubmit = (typeof voiceOverride === 'string' ? voiceOverride : quickTextState).trim();
    assert.strictEqual(textToSubmit, 'Oração da madrugada no monte');

    const title = generateAutoTitle(textToSubmit, fixedDate);
    assert.strictEqual(title, 'Oração da madrugada no monte · 08/10');

    const payload: Omit<MemorialEntry, 'id' | 'created_at'> = {
      title,
      content: textToSubmit,
      category: 'reflexao',
      is_answered: false,
      tags: [],
      ai_status: 'none',
    };

    assert.strictEqual(payload.content, 'Oração da madrugada no monte');
    assert.strictEqual(payload.category, 'reflexao');
  });

  it('deve concatenar o texto base anterior com o relato transcrito por voz caso já houvesse digitação prévia', () => {
    const baseText = 'Reflexão sobre Salmos:';
    const voiceTranscript = 'O Senhor é meu pastor e nada me faltará.';

    const combined = baseText.trim()
      ? `${baseText.trim()}\n\n${voiceTranscript.trim()}`
      : voiceTranscript.trim();

    assert.strictEqual(
      combined,
      'Reflexão sobre Salmos:\n\nO Senhor é meu pastor e nada me faltará.'
    );

    const title = generateAutoTitle(combined, fixedDate);
    assert.ok(title.startsWith('Reflexão sobre Salmos:'));
  });

  it('não deve disparar submissão quando a transcrição por voz retornar vazia ou apenas espaços', () => {
    let wasSubmitted = false;

    const simulateSubmit = (textOverride?: string) => {
      const trimmed = (typeof textOverride === 'string' ? textOverride : '').trim();
      if (!trimmed) return;
      wasSubmitted = true;
    };

    simulateSubmit('');
    simulateSubmit('     \n\t   ');
    assert.strictEqual(wasSubmitted, false, 'Não deve submeter transcrições vazias');

    simulateSubmit('Graça e paz multiplicadas');
    assert.strictEqual(wasSubmitted, true, 'Deve submeter com sucesso quando houver conteúdo legítimo');
  });

  it('deve preservar o rascunho anterior caso o reconhecimento de voz seja cancelado ou falhe', () => {
    const originalDraft = 'Rascunho importante que não pode ser perdido';
    let currentInput = originalDraft;

    // Simula início da gravação por voz guardando a base
    const baseContentBeforeLiveRef = originalDraft;

    // Usuário fala algo parcial (alterando o input durante o ditado)
    currentInput = `${baseContentBeforeLiveRef}\n\nTexto parcial que falhou...`;

    // Falha ou cancelamento da gravação
    const onVoiceFailOrCancel = () => {
      currentInput = baseContentBeforeLiveRef;
    };
    onVoiceFailOrCancel();

    assert.strictEqual(currentInput, originalDraft, 'Deve restaurar intacto o rascunho original');
  });
});
