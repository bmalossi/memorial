/**
 * memorialStore.ts — Sincronização de Marcos de Fé com o Supabase & Cache Local
 *
 * Arquitetura Offline-First & Cloud Sync:
 * 1. Cache local persistente via AsyncStorage para carregamento imediato (0 latência).
 * 2. Sincronização bidirecional resiliente com a tabela `user_notes` compartilhada com o Bíblia Vive.
 * 3. Fila de pendências offline para envio automático assim que a conexão for reestabelecida.
 * 4. Notificação de estado em tempo real para indicadores visuais na UI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, MemorialCategory } from './supabase';
import { MemorialEntry, BibleRef, AiConnection, JevCategory, PastoralIntent, SyncStatus, MOCK_ENTRIES } from './types';

const STORAGE_KEY_ENTRIES = '@memorial_cache_entries_v2';
const STORAGE_KEY_PENDING = '@memorial_pending_queue_v2';
const STORAGE_KEY_LAST_SYNC = '@memorial_last_sync_timestamp_v2';

export interface SyncStateInfo {
  status: 'synced' | 'syncing' | 'offline' | 'error' | 'local_only' | 'pending';
  lastSyncTime: string | null;
  pendingCount: number;
  cloudCount: number;
  errorMessage?: string;
}

interface PendingAction {
  action: 'create' | 'update' | 'delete' | 'mark_answered' | 'update_ai' | 'update_pastoral_intent';
  id: string;
  entry?: any;
  payload?: any;
  createdAt: string;
}

// ─── Gerenciador de Ouvintes de Sincronização ──────────────────────────────────
type SyncListener = (info: SyncStateInfo) => void;
const syncListeners: Set<SyncListener> = new Set();

let currentSyncState: SyncStateInfo = {
  status: 'local_only',
  lastSyncTime: null,
  pendingCount: 0,
  cloudCount: 0,
};

function notifySyncListeners(partial?: Partial<SyncStateInfo>) {
  if (partial) {
    currentSyncState = { ...currentSyncState, ...partial };
  }
  syncListeners.forEach((listener) => {
    try {
      listener(currentSyncState);
    } catch {}
  });
}

export function subscribeToSyncState(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncState);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncState(): SyncStateInfo {
  return currentSyncState;
}

// ─── Conversores de Categoria ────────────────────────────────────────────────
function mapTypeToCategory(type: string | undefined): MemorialCategory {
  switch (type) {
    case 'prayer':
      return 'oracao';
    case 'testimony':
      return 'testemunho';
    case 'fasting':
      return 'jejum';
    case 'reflection':
    case 'inspiration':
    default:
      return 'reflexao';
  }
}

function mapCategoryToType(category: MemorialCategory): string {
  switch (category) {
    case 'oracao':
      return 'prayer';
    case 'testemunho':
      return 'testimony';
    case 'jejum':
      return 'fasting';
    case 'reflexao':
    default:
      return 'reflection';
  }
}

/**
 * Constrói o payload para inserção/atualização na tabela `user_notes` do Supabase.
 * Garante conformidade estrita com as restrições canônicas de banco de dados:
 * - `book_id text NOT NULL`: utiliza o slug da passagem ou 'geral' como sentinela canônica.
 * - `chapter integer NOT NULL`: utiliza o capítulo bíblico ou 0 para registros gerais.
 * - `verse integer`: utiliza o versículo ou 0.
 * Dessa forma, NUNCA viola constraints NOT NULL em nenhum ambiente Supabase.
 */
export function buildSupabaseNotePayload(
  userId: string,
  entry: Partial<MemorialEntry> & { category?: MemorialCategory; content?: string }
) {
  const ref = entry.bible_ref;
  const primaryConnection = entry.ai_connections?.[0];

  let bookId = 'geral';
  let bookName = 'Geral';
  let chapter = 0;
  let verse = 0;

  if (ref && ref.slug) {
    bookId = ref.slug.toLowerCase();
    bookName = ref.book || ref.slug;
    chapter = Number(ref.chapter) || 1;
    verse = ref.verse ? Number(ref.verse) : 0;
  } else if (primaryConnection && primaryConnection.book_slug) {
    bookId = primaryConnection.book_slug.toLowerCase();
    bookName = primaryConnection.reference
      ? primaryConnection.reference.split(' ')[0]
      : primaryConnection.book_slug;
    chapter = Number(primaryConnection.chapter) || 1;
    verse = primaryConnection.verse ? Number(primaryConnection.verse) : 0;
  }

  const versePart = verse > 0 ? `.${verse}` : '';
  const verseId = `${bookId.toUpperCase()}.${chapter}${versePart}`;

  return {
    user_id: userId,
    type: mapCategoryToType(entry.category || 'reflexao'),
    title: entry.title || null,
    content: entry.content || '',
    book_id: bookId,
    book_name: bookName,
    chapter: chapter,
    verse: verse,
    verse_id: verseId,
    tags: entry.tags || [],
    pastoral_intent: entry.pastoral_intent || null,
    pastoral_intent_confidence: entry.pastoral_intent_confidence || null,
    pastoral_intent_evaluated_at: entry.pastoral_intent_evaluated_at || null,
    pastoral_intent_reason: entry.pastoral_intent_reason || null,
    pastoral_alert_sent_types: entry.pastoral_alert_sent_types || [],
    metadata: {
      tags: entry.tags || [],
      ai_connections: entry.ai_connections || [],
      jev_category: entry.jev_category || null,
      pastoral_intent: entry.pastoral_intent || null,
      pastoral_intent_confidence: entry.pastoral_intent_confidence || null,
      pastoral_intent_evaluated_at: entry.pastoral_intent_evaluated_at || null,
      pastoral_intent_reason: entry.pastoral_intent_reason || null,
      pastoral_alert_sent_types: entry.pastoral_alert_sent_types || [],
      created_from: 'memorial_app',
    },
  };
}

/**
 * Mapeia uma linha da tabela `user_notes` do Supabase para o modelo `MemorialEntry`
 */
export function mapSupabaseRowToEntry(row: any): MemorialEntry {
  let bible_ref: BibleRef | undefined = undefined;

  const isGeneral =
    !row.book_id ||
    row.book_id.toLowerCase() === 'geral' ||
    row.book_id.toLowerCase() === 'general' ||
    Number(row.chapter) === 0;

  if (!isGeneral && row.chapter !== undefined && row.chapter !== null && Number(row.chapter) > 0) {
    const bookName = row.book_name || row.book_id;
    const verseNum = row.verse && Number(row.verse) > 0 ? Number(row.verse) : undefined;
    const versePart = verseNum ? `:${verseNum}` : '';
    bible_ref = {
      book: bookName,
      slug: (row.book_id || 'sl').toLowerCase(),
      chapter: Number(row.chapter),
      verse: verseNum,
      display: `${bookName} ${row.chapter}${versePart}`,
    };
  }

  let tags: string[] = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags;
  } else if (Array.isArray(row.metadata?.tags)) {
    tags = row.metadata.tags;
  }

  const ai_connections = Array.isArray(row.metadata?.ai_connections)
    ? row.metadata.ai_connections
    : undefined;

  const jev_category = row.metadata?.jev_category || undefined;
  const isAnswered = Boolean(row.answered_at) || row.status === 'answered';

  const pastoralIntent = row.pastoral_intent || row.metadata?.pastoral_intent || null;
  const pastoralConfidence =
    row.pastoral_intent_confidence ?? row.metadata?.pastoral_intent_confidence ?? null;
  const pastoralEvaluatedAt =
    row.pastoral_intent_evaluated_at || row.metadata?.pastoral_intent_evaluated_at || null;
  const pastoralReason =
    row.pastoral_intent_reason || row.metadata?.pastoral_intent_reason || null;
  const pastoralAlertSentTypes = Array.isArray(row.pastoral_alert_sent_types)
    ? row.pastoral_alert_sent_types
    : Array.isArray(row.metadata?.pastoral_alert_sent_types)
    ? row.metadata.pastoral_alert_sent_types
    : [];

  return {
    id: String(row.id),
    category: mapTypeToCategory(row.type),
    title: row.title || undefined,
    content: row.content || row.note || '',
    bible_ref,
    tags: tags.length > 0 ? tags : undefined,
    ai_status: ai_connections && ai_connections.length > 0 ? 'done' : 'none',
    ai_connections,
    jev_category,
    is_answered: isAnswered,
    answered_at: row.answered_at || undefined,
    pastoral_intent: pastoralIntent,
    pastoral_intent_confidence: pastoralConfidence,
    pastoral_intent_evaluated_at: pastoralEvaluatedAt,
    pastoral_intent_reason: pastoralReason,
    pastoral_alert_sent_types: pastoralAlertSentTypes,
    created_at: row.created_at || new Date().toISOString(),
    sync_status: 'synced',
  };
}

// ─── Helpers de Armazenamento Local ──────────────────────────────────────────
async function readLocalCache(): Promise<MemorialEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalCache(entries: MemorialEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  } catch {}
}

async function readPendingQueue(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDING);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writePendingQueue(queue: PendingAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(queue));
    notifySyncListeners({ pendingCount: queue.length });
  } catch {}
}

async function enqueuePendingAction(action: PendingAction): Promise<void> {
  const queue = await readPendingQueue();
  // Remove qualquer ação redundante anterior para o mesmo ID
  const filtered = queue.filter((item) => !(item.id === action.id && item.action === action.action));
  filtered.push(action);
  await writePendingQueue(filtered);
}

// ─── Consulta Principal e Sincronização ───────────────────────────────────────

/**
 * Carrega todos os marcos de fé:
 * 1. Retorna instantaneamente os marcos do cache local.
 * 2. Em segundo plano, aciona a sincronização em nuvem se houver usuário conectado.
 */
export async function fetchUserMemorials(forceSync = false): Promise<MemorialEntry[]> {
  const localEntries = await readLocalCache();
  const lastSync = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC);
  const queue = await readPendingQueue();

  // Se o cache estiver vazio (primeira execução), inicializa com mocks amigáveis
  let activeEntries = localEntries;
  if (localEntries.length === 0) {
    activeEntries = MOCK_ENTRIES.map((m) => ({ ...m, sync_status: 'local_only' as SyncStatus }));
    await writeLocalCache(activeEntries);
  }

  notifySyncListeners({
    lastSyncTime: lastSync,
    pendingCount: queue.length,
    cloudCount: activeEntries.filter((e) => e.sync_status === 'synced').length,
  });

  // Tenta sincronizar silenciosamente com o Supabase
  syncMemorialsWithSupabase().catch((err) => {
    console.log('[Memorial Sync] Sincronização em background pausada:', err?.message || err);
  });

  return activeEntries;
}

// ─── Exclusão mútua: evita envios duplicados da mesma pendência ───────────────
let storeLock: Promise<unknown> = Promise.resolve();
function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeLock.then(fn, fn);
  storeLock = run.catch(() => {});
  return run;
}

let syncInFlight: Promise<{ entries: MemorialEntry[]; syncedCount: number }> | null = null;

/**
 * Executa a sincronização completa bidirecional com o Supabase.
 * Chamadas simultâneas compartilham a mesma execução (single-flight).
 */
export function syncMemorialsWithSupabase(): Promise<{
  entries: MemorialEntry[];
  syncedCount: number;
}> {
  if (!syncInFlight) {
    syncInFlight = withStoreLock(runSyncMemorials).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

async function runSyncMemorials(): Promise<{
  entries: MemorialEntry[];
  syncedCount: number;
}> {
  const lastSync = await AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC);

  // 1. Verifica se há usuário autenticado
  const { data: sessionData } = await supabase.auth.getSession();
  let user = sessionData?.session?.user ?? null;

  if (!user) {
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user ?? null;
  }

  const localEntries = await readLocalCache();
  const queue = await readPendingQueue();

  if (!user) {
    notifySyncListeners({
      status: 'local_only',
      pendingCount: queue.length,
      lastSyncTime: lastSync,
      cloudCount: 0,
    });
    return { entries: localEntries, syncedCount: 0 };
  }

  notifySyncListeners({
    status: 'syncing',
    pendingCount: queue.length,
  });

  try {
    // 2. PUSH: Processa fila de ações pendentes (criadas/editadas offline)
    if (queue.length > 0) {
      console.log(`[Memorial Sync] Enviando ${queue.length} ações pendentes para o Supabase...`);
      const remainingQueue: PendingAction[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'create' && item.entry) {
            const payload = buildSupabaseNotePayload(user.id, item.entry);

            const { data: inserted, error: insertErr } = await supabase
              .from('user_notes')
              .insert(payload)
              .select()
              .single();

            if (insertErr) throw insertErr;

            // Substitui o ID temporário local pelo ID real do Supabase
            if (inserted) {
              const cached = await readLocalCache();
              const updated = cached.map((c) =>
                c.id === item.id ? { ...mapSupabaseRowToEntry(inserted), sync_status: 'synced' as SyncStatus } : c
              );
              await writeLocalCache(updated);
            }

          } else if (item.action === 'mark_answered') {
            await supabase
              .from('user_notes')
              .update({
                status: 'answered',
                answered_at: item.payload?.answered_at || new Date().toISOString(),
                answered_note: item.payload?.note || null,
              })
              .eq('id', item.id)
              .eq('user_id', user.id);

          } else if (item.action === 'delete') {
            await supabase
              .from('user_notes')
              .delete()
              .eq('id', item.id)
              .eq('user_id', user.id);

          } else if (item.action === 'update_ai') {
            const { data: currentNote } = await supabase
              .from('user_notes')
              .select('metadata')
              .eq('id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();

            const currentMeta = (currentNote?.metadata as Record<string, any>) || {};
            await supabase
              .from('user_notes')
              .update({
                metadata: {
                  ...currentMeta,
                  ai_connections: item.payload?.connections || [],
                  jev_category: item.payload?.jevCategory || currentMeta.jev_category || null,
                  ai_status: 'done',
                  ai_evaluated_at: new Date().toISOString(),
                },
              })
              .eq('id', item.id)
              .eq('user_id', user.id);

          } else if (item.action === 'update_pastoral_intent') {
            const { data: currentNote } = await supabase
              .from('user_notes')
              .select('metadata')
              .eq('id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();

            const currentMeta = (currentNote?.metadata as Record<string, any>) || {};
            await supabase
              .from('user_notes')
              .update({
                pastoral_intent: item.payload?.intent || null,
                pastoral_intent_confidence: item.payload?.confidence || null,
                pastoral_intent_evaluated_at: item.payload?.evaluated_at || new Date().toISOString(),
                pastoral_intent_reason: item.payload?.reason || null,
                metadata: {
                  ...currentMeta,
                  pastoral_intent: item.payload?.intent || null,
                  pastoral_intent_confidence: item.payload?.confidence || null,
                  pastoral_intent_evaluated_at: item.payload?.evaluated_at || new Date().toISOString(),
                  pastoral_intent_reason: item.payload?.reason || null,
                },
              })
              .eq('id', item.id)
              .eq('user_id', user.id);
          }
        } catch (pushErr: any) {
          console.log('[Memorial Sync] Item pendente em fila local:', item.id, pushErr?.message || pushErr);
          remainingQueue.push(item);
        }
      }

      await writePendingQueue(remainingQueue);
    }

    // 3. PULL: Busca todos os marcos atualizados da nuvem
    const { data: cloudNotes, error: fetchErr } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    const cloudEntries: MemorialEntry[] = (cloudNotes || []).map(mapSupabaseRowToEntry);

    // 4. MERGE: Junta dados da nuvem com eventuais rascunhos locais ainda pendentes
    const updatedPendingQueue = await readPendingQueue();
    const pendingIds = new Set(updatedPendingQueue.map((p) => p.id));
    const cachedNow = await readLocalCache();

    // Mantém itens locais que ainda não foram sincronizados
    const unsyncedLocals = cachedNow.filter(
      (e) => pendingIds.has(e.id) || e.sync_status === 'pending' || e.sync_status === 'local_only'
    );

    const mergedMap = new Map<string, MemorialEntry>();
    cloudEntries.forEach((c) => mergedMap.set(c.id, c));
    unsyncedLocals.forEach((l) => {
      if (!mergedMap.has(l.id)) {
        mergedMap.set(l.id, l);
      }
    });

    const finalMerged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Salva no cache local permanente
    await writeLocalCache(finalMerged);

    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, nowIso);

    notifySyncListeners({
      status: 'synced',
      lastSyncTime: nowIso,
      pendingCount: updatedPendingQueue.length,
      cloudCount: cloudEntries.length,
    });

    return { entries: finalMerged, syncedCount: cloudEntries.length };

  } catch (err: any) {
    console.warn('[Memorial Sync] Falha durante sincronização com Supabase:', err?.message || err);
    notifySyncListeners({
      status: 'offline',
      errorMessage: err?.message || 'Falha de conexão com a nuvem.',
    });
    return { entries: await readLocalCache(), syncedCount: 0 };
  }
}

/**
 * Salva um novo marco de fé (Local-First com upload em segundo plano).
 */
export function saveUserMemorial(
  entry: Omit<MemorialEntry, 'id' | 'created_at'>
): Promise<MemorialEntry> {
  // Serializado com a sincronização: impede que a fila reenvie este registro
  // enquanto o envio imediato ainda está em andamento (causa de duplicatas).
  return withStoreLock(() => saveUserMemorialUnlocked(entry));
}

async function saveUserMemorialUnlocked(
  entry: Omit<MemorialEntry, 'id' | 'created_at'>
): Promise<MemorialEntry> {
  const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newEntry: MemorialEntry = {
    ...entry,
    id: tempId,
    created_at: now,
    sync_status: 'pending',
  };

  // 1. Grava imediatamente no cache local (latência zero para o usuário)
  const cached = await readLocalCache();
  const updatedCache = [newEntry, ...cached];
  await writeLocalCache(updatedCache);

  // 2. Enfileira pendência
  await enqueuePendingAction({
    action: 'create',
    id: tempId,
    entry: newEntry,
    createdAt: now,
  });

  // 3. Tenta envio imediato se estiver conectado
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    try {
      const payload = buildSupabaseNotePayload(user.id, entry);

      const { data: inserted, error: insertErr } = await supabase
        .from('user_notes')
        .insert(payload)
        .select()
        .single();

      if (!insertErr && inserted) {
        const cloudEntry = mapSupabaseRowToEntry(inserted);
        // Atualiza cache local com o ID definitivo do Supabase
        const reCached = await readLocalCache();
        const finalCache = reCached.map((item) => (item.id === tempId ? cloudEntry : item));
        await writeLocalCache(finalCache);

        // Remove da fila de pendências
        const currentQueue = await readPendingQueue();
        await writePendingQueue(currentQueue.filter((q) => q.id !== tempId));

        notifySyncListeners({ status: 'synced' });
        return cloudEntry;
      }
    } catch (e) {
      console.log('[Memorial] Falha no envio imediato, mantido na fila offline:', e);
    }
  }

  notifySyncListeners({ status: user ? 'pending' : 'local_only' });
  return newEntry;
}

/**
 * Marca oração como respondida (Local-First).
 */
export async function markPrayerAnsweredInSupabase(
  id: string,
  answeredNote?: string
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Atualiza cache local imediatamente
  const cached = await readLocalCache();
  const updatedCache = cached.map((e) =>
    e.id === id ? { ...e, is_answered: true, answered_at: now } : e
  );
  await writeLocalCache(updatedCache);

  // 2. Enfileira pendência
  await enqueuePendingAction({
    action: 'mark_answered',
    id,
    payload: { answered_at: now, note: answeredNote },
    createdAt: now,
  });

  // 3. Tenta enviar para Supabase se autenticado
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    try {
      await supabase
        .from('user_notes')
        .update({
          status: 'answered',
          answered_at: now,
          answered_note: answeredNote || null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      const queue = await readPendingQueue();
      await writePendingQueue(queue.filter((q) => !(q.id === id && q.action === 'mark_answered')));
    } catch {}
  }
}

/**
 * Exclui um marco de fé (Local-First).
 */
export async function deleteUserMemorial(id: string): Promise<void> {
  // 1. Remove do cache local
  const cached = await readLocalCache();
  await writeLocalCache(cached.filter((e) => e.id !== id));

  // 2. Enfileira pendência
  await enqueuePendingAction({
    action: 'delete',
    id,
    createdAt: new Date().toISOString(),
  });

  // 3. Tenta deletar no Supabase se autenticado
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    try {
      await supabase
        .from('user_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      const queue = await readPendingQueue();
      await writePendingQueue(queue.filter((q) => !(q.id === id && q.action === 'delete')));
    } catch {}
  }
}

/**
 * Atualiza conexões da IA de um marco (Local-First).
 */
export async function updateMemorialAiConnections(
  id: string,
  connections: AiConnection[],
  jevCategory?: JevCategory
): Promise<void> {
  // 1. Atualiza cache local
  const cached = await readLocalCache();
  const updatedCache = cached.map((e) =>
    e.id === id
      ? {
          ...e,
          ai_connections: connections,
          jev_category: jevCategory || e.jev_category,
          ai_status: 'done' as const,
        }
      : e
  );
  await writeLocalCache(updatedCache);

  // 2. Enfileira pendência
  await enqueuePendingAction({
    action: 'update_ai',
    id,
    payload: { connections, jevCategory },
    createdAt: new Date().toISOString(),
  });

  // 3. Envia para Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    try {
      const { data: currentNote } = await supabase
        .from('user_notes')
        .select('metadata')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      const currentMeta = (currentNote?.metadata as Record<string, any>) || {};

      await supabase
        .from('user_notes')
        .update({
          metadata: {
            ...currentMeta,
            ai_connections: connections,
            jev_category: jevCategory || currentMeta.jev_category || null,
            ai_status: 'done',
            ai_evaluated_at: new Date().toISOString(),
          },
        })
        .eq('id', id)
        .eq('user_id', user.id);

      const queue = await readPendingQueue();
      await writePendingQueue(queue.filter((q) => !(q.id === id && q.action === 'update_ai')));
    } catch (e) {
      console.warn('[Memorial] Erro ao sincronizar conexões da IA:', e);
    }
  }
}

/**
 * Atualiza a classificação da intenção pastoral (4 Pilares) de um marco (Local-First).
 */
export async function updateMemorialPastoralIntent(
  id: string,
  classification: {
    intent: PastoralIntent | null;
    confidence: number;
    reason?: string;
    evaluated_at?: string;
  }
): Promise<void> {
  const now = classification.evaluated_at || new Date().toISOString();

  // 1. Atualiza cache local
  const cached = await readLocalCache();
  const updatedCache = cached.map((e) =>
    e.id === id
      ? {
          ...e,
          pastoral_intent: classification.intent,
          pastoral_intent_confidence: classification.confidence,
          pastoral_intent_evaluated_at: now,
          pastoral_intent_reason: classification.reason,
        }
      : e
  );
  await writeLocalCache(updatedCache);

  // 2. Enfileira pendência
  await enqueuePendingAction({
    action: 'update_pastoral_intent',
    id,
    payload: {
      intent: classification.intent,
      confidence: classification.confidence,
      reason: classification.reason,
      evaluated_at: now,
    },
    createdAt: now,
  });

  // 3. Envia para Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    try {
      const { data: currentNote } = await supabase
        .from('user_notes')
        .select('metadata')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      const currentMeta = (currentNote?.metadata as Record<string, any>) || {};

      await supabase
        .from('user_notes')
        .update({
          pastoral_intent: classification.intent,
          pastoral_intent_confidence: classification.confidence,
          pastoral_intent_evaluated_at: now,
          pastoral_intent_reason: classification.reason,
          metadata: {
            ...currentMeta,
            pastoral_intent: classification.intent,
            pastoral_intent_confidence: classification.confidence,
            pastoral_intent_evaluated_at: now,
            pastoral_intent_reason: classification.reason,
          },
        })
        .eq('id', id)
        .eq('user_id', user.id);

      const queue = await readPendingQueue();
      await writePendingQueue(
        queue.filter((q) => !(q.id === id && q.action === 'update_pastoral_intent'))
      );
    } catch (e) {
      console.warn('[Memorial] Erro ao sincronizar intenção pastoral:', e);
    }
  }
}

