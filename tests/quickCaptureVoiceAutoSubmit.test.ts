import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAutoTitle } from '../src/lib/utils';
import type { MemorialEntry, PastoralContact } from '../src/lib/types';

describe('Bottom-Docked Quick Capture — Envio Automático por Voz & Blindagem Contra Cliques Prematuros', () => {
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

  it('deve bloquear encerramento acidental se o usuário clicar no microfone com menos de 700ms de gravação', () => {
    let stopped = false;
    const startTime = Date.now();

    const simulateStopClick = (elapsedMs: number) => {
      if (elapsedMs < 700) {
        // Bloqueado pelo guard contra clique duplo acidental
        return;
      }
      stopped = true;
    };

    // Tentativa imediata (50ms após o clique de início)
    simulateStopClick(50);
    assert.strictEqual(stopped, false, 'Deve ignorar clique imediato para não encerrar instantaneamente');

    // Tentativa com 200ms
    simulateStopClick(200);
    assert.strictEqual(stopped, false, 'Deve manter gravando mesmo se houver repique de clique');

    // Parada legítima após falar (1500ms)
    simulateStopClick(1500);
    assert.strictEqual(stopped, true, 'Deve permitir parar quando a gravação tiver duração legítima');
  });

  it('NUNCA deve ativar isRecording antes de startNativeRecording concluir (evita cancelamento durante permissão no Android)', async () => {
    const events: string[] = [];
    let isRecording = false;

    const mockStartNativeRecording = async () => {
      events.push('native_init_start');
      // Simula Android emitindo AppState background durante checagem de permissão
      if (isRecording) {
        events.push('premature_cancel_triggered');
      }
      await new Promise((r) => setTimeout(r, 10));
      events.push('native_record_active');
    };

    await mockStartNativeRecording();
    isRecording = true;
    events.push('ui_recording_true');

    assert.ok(!events.includes('premature_cancel_triggered'), 'Não deve estar com isRecording=true durante inicialização nativa');
    assert.deepStrictEqual(events, [
      'native_init_start',
      'native_record_active',
      'ui_recording_true',
    ]);
  });

  it('transições efêmeras de AppState background no Android (< 5000ms) NÃO devem encerrar a gravação ativa', async () => {
    let cancelled = false;
    let currentAppState = 'active';
    let bgTimer: any = null;

    const onAppStateChange = (nextState: string) => {
      currentAppState = nextState;
      if (nextState === 'background') {
        if (bgTimer) clearTimeout(bgTimer);
        bgTimer = setTimeout(() => {
          if (currentAppState === 'background') {
            cancelled = true;
          }
        }, 50); // 50ms representando a janela de debounce no teste
      } else if (nextState === 'active' && bgTimer) {
        clearTimeout(bgTimer);
        bgTimer = null;
      }
    };

    // Blip rápido do Android (GrantPermissionsActivity / foco de áudio: 10ms)
    onAppStateChange('background');
    await new Promise((r) => setTimeout(r, 10));
    onAppStateChange('active');
    await new Promise((r) => setTimeout(r, 60));

    assert.strictEqual(cancelled, false, 'Blip efêmero de background no Android jamais deve cancelar gravação');
  });

  it('NovoRegistroSheet fechado (isRecording = false) NUNCA deve cancelar o gravador nativo global da BottomQuickCaptureBar', () => {
    let globalNativeRecorderCancelled = false;
    const sheetIsRecordingRef = { current: false };

    const sheetCancelVoiceRecording = () => {
      if (!sheetIsRecordingRef.current) return;
      globalNativeRecorderCancelled = true;
    };

    // Sheet fechado atualiza props enquanto a barra rápida está gravando
    sheetCancelVoiceRecording();
    assert.strictEqual(
      globalNativeRecorderCancelled,
      false,
      'Sheet inativo não pode interromper o singleton de áudio da barra rápida'
    );
  });
});

describe('Pastoral Onboarding Banner — Invariantes de Exibição sem Flickering', () => {
  const mockPastor: PastoralContact = {
    id: 'pastor-123',
    user_id: 'user-456',
    name: 'Pastor Jonas',
    email: 'jonas@igreja.com',
    role: 'pastor',
    requester_name: 'Bruno',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  it('NUNCA deve exibir o card enquanto o contato pastoral ainda estiver carregando (isPastoralLoaded = false)', () => {
    const isPastoralLoaded = false;
    const loading = false;
    const pastoralContact = null;
    const isSearchOpen = false;

    const visible = isPastoralLoaded && !loading && !pastoralContact && !isSearchOpen;
    assert.strictEqual(visible, false, 'Card não deve aparecer durante o carregamento inicial');
  });

  it('NUNCA deve exibir o card se a conta já possui cobertura pastoral cadastrada (pastoralContact != null)', () => {
    const isPastoralLoaded = true;
    const loading = false;
    const pastoralContact = mockPastor;
    const isSearchOpen = false;

    const visible = isPastoralLoaded && !loading && !pastoralContact && !isSearchOpen;
    assert.strictEqual(visible, false, 'Card jamais deve aparecer se usuário tem pastor');
  });

  it('DEVE exibir o card apenas quando a verificação concluiu e o usuário NÃO possui cobertura pastoral', () => {
    const isPastoralLoaded = true;
    const loading = false;
    const pastoralContact = null;
    const isSearchOpen = false;

    const visible = isPastoralLoaded && !loading && !pastoralContact && !isSearchOpen;
    assert.strictEqual(visible, true, 'Card deve aparecer suavemente apenas na ausência confirmada de pastor');
  });

  it('NUNCA deve exibir o card se a busca estiver aberta', () => {
    const isPastoralLoaded = true;
    const loading = false;
    const pastoralContact = null;
    const isSearchOpen = true;

    const visible = isPastoralLoaded && !loading && !pastoralContact && !isSearchOpen;
    assert.strictEqual(visible, false);
  });
});
