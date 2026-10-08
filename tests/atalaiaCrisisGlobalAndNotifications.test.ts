// Polyfill window.localStorage para testes executados em ambiente Node.js / tsx
if (typeof (global as any).window === 'undefined') {
  const store = new Map<string, string>();
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    },
  };
}

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  subscribeToCrisisModal,
  triggerGlobalAtalaiaCrisis,
  dismissGlobalAtalaiaCrisis,
  getGlobalCrisisState,
  evaluateAndTriggerAtalaiaCare,
  setNativeNotificationDispatcher,
  CrisisModalData,
} from '../src/lib/atalaiaCrisisManager';

describe('Atalaia Crisis Manager — Acolhimento Global e Notificações no Aparelho', () => {
  let dispatchedNotifications: Array<{ noteId?: string; pastorName?: string }> = [];

  beforeEach(() => {
    dismissGlobalAtalaiaCrisis();
    dispatchedNotifications = [];
    setNativeNotificationDispatcher(async (opts) => {
      dispatchedNotifications.push(opts);
    });
  });

  it('deve inicializar com o modal de crise invisível', () => {
    const state = getGlobalCrisisState();
    assert.equal(state.visible, false);
  });

  it('deve notificar inscritos globais ao disparar crise em qualquer parte do app', () => {
    let receivedData: CrisisModalData | null = null;
    const unsubscribe = subscribeToCrisisModal((data) => {
      receivedData = data;
    });

    triggerGlobalAtalaiaCrisis({
      noteId: 'test_note_123',
      pastorName: 'Pr. Carlos Silveira',
      hasActivePastor: true,
    });

    assert.ok(receivedData !== null);
    assert.equal((receivedData as CrisisModalData).visible, true);
    assert.equal((receivedData as CrisisModalData).noteId, 'test_note_123');
    assert.equal((receivedData as CrisisModalData).pastorName, 'Pr. Carlos Silveira');
    assert.equal((receivedData as CrisisModalData).hasActivePastor, true);

    unsubscribe();
  });

  it('deve fechar o modal globalmente ao chamar dismissGlobalAtalaiaCrisis', () => {
    triggerGlobalAtalaiaCrisis({
      noteId: 'test_note_456',
    });
    assert.equal(getGlobalCrisisState().visible, true);

    dismissGlobalAtalaiaCrisis();
    assert.equal(getGlobalCrisisState().visible, false);
  });

  it('deve acionar acolhimento global E notificação nativa ao avaliar memória com perda de vontade de viver', async () => {
    let triggeredModal = false;
    const unsubscribe = subscribeToCrisisModal((data) => {
      if (data.visible && data.noteId === 'note_crisis_test_789') {
        triggeredModal = true;
      }
    });

    const result = await evaluateAndTriggerAtalaiaCare({
      id: 'note_crisis_test_789',
      title: 'Momento difícil',
      content: 'Não aguento mais essa dor e não tô com mais vontade de viver.',
      category: 'reflexao',
    });

    assert.equal(result.intent, 'CRISIS');
    assert.ok(result.confidence >= 0.95);
    assert.equal(triggeredModal, true);

    // Invariante de Segurança: Notificação no celular foi disparada para chegar mesmo com aparelho fechado
    assert.equal(dispatchedNotifications.length, 1);
    assert.equal(dispatchedNotifications[0].noteId, 'note_crisis_test_789');

    unsubscribe();
  });

  it('não deve disparar modal nem notificação para relatos de paz e gratidão', async () => {
    dismissGlobalAtalaiaCrisis();
    let triggeredCrisis = false;

    const unsubscribe = subscribeToCrisisModal((data) => {
      if (data.visible && data.noteId === 'note_thanks_001') {
        triggeredCrisis = true;
      }
    });

    const result = await evaluateAndTriggerAtalaiaCare({
      id: 'note_thanks_001',
      title: 'Dia de bênção',
      content: 'Hoje foi um dia abençoado, o Senhor proveu para nossa família e estamos muito felizes.',
      category: 'testemunho',
    });

    assert.notEqual(result.intent, 'CRISIS');
    assert.equal(triggeredCrisis, false);
    assert.equal(dispatchedNotifications.length, 0);

    unsubscribe();
  });
});
