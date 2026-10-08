/**
 * atalaiaCrisisManager.ts — Gerenciador Global de Crise e Acolhimento Atalaia
 *
 * Responsável por:
 * 1. Manter o estado global e listeners do popup de crise (visível em qualquer parte do app).
 * 2. Avaliar memórias criadas em qualquer tela (Linha Sagrada, Bíblia, Busca).
 * 3. Disparar imediatamente a notificação nativa no celular (para que chegue mesmo com aparelho fechado).
 * 4. Executar a triagem assíncrona da IA e, ao concluir, acionar imediatamente o popup e a notificação.
 */

import {
  classifyPastoralIntentLocally,
  classifyPastoralIntent,
  PastoralClassificationResult,
} from './classifierJEV';
import { fetchCurrentPastoralContact } from './atalaiaStore';
import { updateMemorialPastoralIntent, setOnMemorialSavedListener } from './memorialStore';
import { MemorialEntry } from './types';

type NotificationDispatcher = (options: { noteId?: string; pastorName?: string }) => Promise<void>;

let activeNotificationDispatcher: NotificationDispatcher = async (options) => {
  try {
    const { scheduleAtalaiaCrisisNotification } = require('./notificationService');
    if (typeof scheduleAtalaiaCrisisNotification === 'function') {
      await scheduleAtalaiaCrisisNotification(options);
    }
  } catch (err) {
    console.log('[AtalaiaCrisisManager] Notificação nativa em background não disponível:', err);
  }
};

export function setNativeNotificationDispatcher(dispatcher: NotificationDispatcher) {
  activeNotificationDispatcher = dispatcher;
}

async function dispatchNativeCrisisNotification(options: { noteId?: string; pastorName?: string }) {
  try {
    await activeNotificationDispatcher(options);
  } catch (e) {
    console.warn('[AtalaiaCrisisManager] Erro ao disparar notificação nativa:', e);
  }
}

export interface CrisisModalData {
  visible: boolean;
  noteId?: string;
  pastorName?: string;
  hasActivePastor?: boolean;
}

type CrisisListener = (data: CrisisModalData) => void;
const listeners = new Set<CrisisListener>();
let currentCrisisState: CrisisModalData = { visible: false };

// Cache de notas recentemente notificadas para evitar disparos duplicados na mesma sessão
const evaluatedCrisisNotes = new Set<string>();

/**
 * Retorna o estado atual do modal de crise.
 */
export function getGlobalCrisisState(): CrisisModalData {
  return currentCrisisState;
}

/**
 * Inscreve um componente para receber atualizações do modal de crise.
 */
export function subscribeToCrisisModal(listener: CrisisListener): () => void {
  listeners.add(listener);
  // Emite estado atual ao novo inscrito
  listener(currentCrisisState);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Aciona o modal de crise globalmente (visível em qualquer tela do app).
 */
export function triggerGlobalAtalaiaCrisis(data: Partial<CrisisModalData>) {
  currentCrisisState = {
    visible: true,
    noteId: data.noteId,
    pastorName: data.pastorName,
    hasActivePastor: data.hasActivePastor ?? Boolean(data.pastorName),
  };
  listeners.forEach((listener) => {
    try {
      listener(currentCrisisState);
    } catch (e) {
      console.warn('[AtalaiaCrisisManager] Erro no listener de crise:', e);
    }
  });
}

/**
 * Fecha o modal de crise global.
 */
export function dismissGlobalAtalaiaCrisis() {
  currentCrisisState = { visible: false };
  listeners.forEach((listener) => {
    try {
      listener(currentCrisisState);
    } catch (e) {
      console.warn('[AtalaiaCrisisManager] Erro ao fechar modal de crise:', e);
    }
  });
}

/**
 * Avalia uma memória e dispara acolhimento Atalaia imediatamente e/ou após análise da IA.
 */
export async function evaluateAndTriggerAtalaiaCare(entry: {
  id?: string;
  title?: string;
  content: string;
  category?: string;
  bible_ref?: any;
  is_answered?: boolean;
  tags?: string[];
}): Promise<PastoralClassificationResult> {
  const noteKey = entry.id || `${entry.title || ''}_${entry.content.slice(0, 30)}`;

  // Se já foi processada como crise nesta sessão, evita duplicar popup/notificação
  if (evaluatedCrisisNotes.has(noteKey)) {
    return classifyPastoralIntentLocally({
      text: entry.content,
      title: entry.title,
      category: entry.category,
      is_answered: entry.is_answered,
      bible_ref: entry.bible_ref,
      tags: entry.tags,
    });
  }

  // 1. Busca contato pastoral ativo (se configurado)
  let pastorName: string | undefined;
  let hasActivePastor = false;
  try {
    const contact = await fetchCurrentPastoralContact();
    pastorName = contact?.name;
    hasActivePastor = contact?.status === 'active';
  } catch {}

  // 2. Classificação Determinística Local (0ms de latência, 100% offline)
  const localClassification = classifyPastoralIntentLocally({
    text: entry.content,
    title: entry.title,
    category: entry.category,
    is_answered: entry.is_answered,
    bible_ref: entry.bible_ref,
    tags: entry.tags,
  });

  if (localClassification.intent === 'CRISIS') {
    evaluatedCrisisNotes.add(noteKey);

    // A) Abre o modal global onde quer que o usuário esteja
    triggerGlobalAtalaiaCrisis({
      noteId: entry.id,
      pastorName,
      hasActivePastor,
    });

    // B) Dispara notificação nativa no celular (para que receba mesmo com celular fechado)
    dispatchNativeCrisisNotification({
      noteId: entry.id,
      pastorName,
    });

    // C) Persiste intenção pastoral no banco/cache
    if (entry.id) {
      updateMemorialPastoralIntent(entry.id, localClassification).catch(() => {});
    }

    return localClassification;
  }

  // 3. Classificação assíncrona profunda (Edge Function / TypeSafe JEV)
  // Caso a IA identifique crise após processar em background:
  classifyPastoralIntent({
    text: entry.content,
    title: entry.title,
    category: entry.category,
    is_answered: entry.is_answered,
    bible_ref: entry.bible_ref,
    tags: entry.tags,
  })
    .then((asyncResult) => {
      if (entry.id && asyncResult.intent) {
        updateMemorialPastoralIntent(entry.id, asyncResult).catch(() => {});
      }

      if (asyncResult.intent === 'CRISIS' && !evaluatedCrisisNotes.has(noteKey)) {
        evaluatedCrisisNotes.add(noteKey);

        // A) Abre imediatamente o popup global onde o usuário estiver
        triggerGlobalAtalaiaCrisis({
          noteId: entry.id,
          pastorName,
          hasActivePastor,
        });

        // B) Dispara notificação nativa no celular
        dispatchNativeCrisisNotification({
          noteId: entry.id,
          pastorName,
        });
      }
    })
    .catch((err) => {
      console.log('[AtalaiaCrisisManager] Classificação assíncrona finalizada com aviso:', err);
    });

  return localClassification;
}

// ── Inscrição Automática no Ciclo de Vida do MemorialStore ────────────────────
// Garante que qualquer registro salvo em qualquer lugar do aplicativo seja avaliado.
setOnMemorialSavedListener((savedEntry: MemorialEntry) => {
  evaluateAndTriggerAtalaiaCare(savedEntry).catch((err) => {
    console.warn('[AtalaiaCrisisManager] Erro na triagem de memória salva:', err);
  });
});
