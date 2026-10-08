import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, LogBox } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { supabase } from './supabase';
import { MemorialEntry } from './types';
import { fetchUserMemorials } from './memorialStore';

// Suprime alertas e avisos específicos do Expo Go para push remoto no Android
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  '[expo-notifications]: `shouldShowAlert` is deprecated',
  '`shouldShowAlert` is deprecated',
  'Cannot connect to Expo CLI',
]);

// ─── Chaves de Armazenamento e Constantes ──────────────────────────────────────
const STORAGE_KEY_SETTINGS = '@memorial_notification_settings_v1';
export const MEMORIAL_CHANNEL_ID = 'memorial-diario';
export const ATALAIA_CHANNEL_ID = 'atalaia-cuidado-urgente';
const NOTIFICATION_IDENTIFIER_DAILY = 'memorial_daily_reminder';

export function isExpoGoClient(): boolean {
  try {
    return isRunningInExpoGo();
  } catch {
    return false;
  }
}

export interface NotificationSettings {
  enabled: boolean;
  time: string; // Formato "HH:mm", ex: "08:00"
  remindAnsweredPrayers: boolean;
  remindScriptureConnections: boolean;
  pushTokenRegistered: boolean;
  lastToken?: string | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  time: '08:00',
  remindAnsweredPrayers: true,
  remindScriptureConnections: true,
  pushTokenRegistered: false,
  lastToken: null,
};

export const PRESET_TIMES = [
  { id: '06:30', label: '06:30 — Alvorecer Contemplativo', description: 'Para iniciar a caminhada do dia na presença do Senhor' },
  { id: '08:00', label: '08:00 — Matinal (Recomendado)', description: 'Momento de leitura e primeira reflexão do dia' },
  { id: '12:30', label: '12:30 — Meio-dia', description: 'Pausa serena no meio da jornada para recordar Suas promessas' },
  { id: '19:30', label: '19:30 — Crepúsculo', description: 'Ao findar das atividades para respirar gratidão' },
  { id: '21:30', label: '21:30 — Oração Noturna', description: 'Descanso e contemplação antes do repouso' },
];

// ─── 1. Handler e Canais Nativos do Sistema ───────────────────────────────────

/**
 * Inicializa a recepção de notificações quando o app está aberto em primeiro plano.
 */
export function initNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Cria canais de notificação no Android com alta prioridade e acento âmbar.
 */
export async function setupNotificationChannel(): Promise<void> {
  // No Expo Go no Android, o NotificationsChannelsProvider foi descontinuado pela Expo,
  // causando NullPointerException ao tentar invocar métodos de canal.
  // Em APK standalone / build de produção EAS, os canais funcionam normalmente.
  if (isRunningInExpoGo()) {
    return;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(MEMORIAL_CHANNEL_ID, {
        name: 'Marcos de Fé e Escrituras',
        description: 'Lembretes sagrados para recordar a fidelidade de Deus e conexões bíblicas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#D9B463',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync(ATALAIA_CHANNEL_ID, {
        name: 'Acolhimento Atalaia · Apoio à Vida',
        description: 'Apoio imediato, canais de escuta, suporte pastoral e discagem CVV 188',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: '#E7B075',
        sound: 'default',
      });
    } catch (err: any) {
      console.log('[NotificationService] Aviso ao configurar canais:', err?.message || err);
    }
  }
}

// ─── 2. Gerenciador de Preferências ───────────────────────────────────────────

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const updated: NotificationSettings = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));

  if (updated.enabled) {
    const entries = await fetchUserMemorials();
    await scheduleDailyMemorialReminder(updated.time, entries);
  } else {
    await cancelDailyMemorialReminder();
  }

  return updated;
}

// ─── 3. Permissões e Soft-Ask ─────────────────────────────────────────────────

export async function checkNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// ─── 4. Integração Push com Supabase (Estrutura do Bíblia Vive) ────────────────

/**
 * Registra o token push do dispositivo na mesma tabela `public.push_tokens` do Bíblia Vive.
 */
export async function registerPushTokenWithSupabase(): Promise<string | null> {
  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return null;

    await setupNotificationChannel();

    // No Expo Go no Android (SDK 53+), push tokens remotos (FCM) foram descontinuados pela Expo.
    // Lembretes locais continuam 100% operacionais. Em builds standalone (APK/EAS), o FCM roda nativo.
    if (isRunningInExpoGo() && Platform.OS === 'android') {
      console.log('[NotificationService] Expo Go (Android) detectado: push remoto requer Development Build. Lembretes locais de fé ativos.');
      await saveNotificationSettings({ pushTokenRegistered: false });
      return null;
    }

    // Obtém o token do dispositivo
    let token: string | null = null;
    try {
      const expoToken = await Notifications.getExpoPushTokenAsync();
      token = expoToken.data;
    } catch {
      // Fallback para device push token em dev build
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data;
      } catch {}
    }

    if (!token) return null;

    // Obtém usuário autenticado do Supabase se houver
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    // Faz upsert na tabela `push_tokens` (mesma estrutura de `api/notifications/subscribe.ts` do Bíblia Vive)
    const payload: { token: string; user_id?: string | null } = { token };
    if (userId) {
      payload.user_id = userId;
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(payload, { onConflict: 'token' });

    if (error) {
      console.log('[NotificationService] Aviso ao registrar token no Supabase:', error.message);
    } else {
      console.log('[NotificationService] Token push sincronizado com Bíblia Vive com sucesso');
    }

    await saveNotificationSettings({ pushTokenRegistered: true, lastToken: token });
    return token;
  } catch (err: any) {
    console.log('[NotificationService] Erro ao obter/sincronizar push token:', err?.message || err);
    return null;
  }
}

// ─── 5. Algoritmo Inteligente de Lembrete Diário de Marcos ─────────────────────

export interface DailyReminderContent {
  title: string;
  body: string;
  entryId?: string;
  category?: string;
}

/**
 * Analisa os marcos registrados pelo leitor e compõe um lembrete bíblico-espiritual
 * reverente, evitando qualquer sensação de "notificação genérica".
 */
export function generateDailyMemorialReminder(entries: MemorialEntry[]): DailyReminderContent {
  if (!entries || entries.length === 0) {
    return {
      title: 'Memorial · Um altar em seu coração',
      body: 'Reserve um instante de quietude hoje. O que o Senhor tem ensinado à sua alma?',
    };
  }

  // 1. Prioriza orações respondidas (celebração de gratidão)
  const answeredPrayers = entries.filter((e) => e.category === 'oracao' && e.is_answered);
  if (answeredPrayers.length > 0 && Math.random() < 0.4) {
    const randomAnswer = answeredPrayers[Math.floor(Math.random() * answeredPrayers.length)];
    const title = randomAnswer.title ? `"${randomAnswer.title}"` : 'sua oração';
    return {
      title: 'Testemunho de Fidelidade · Memorial',
      body: `Lembra-se de como o Senhor respondeu a ${title}? Celebre hoje o Seu cuidado soberano.`,
      entryId: randomAnswer.id,
      category: 'oracao',
    };
  }

  // 2. Prioriza marcos com conexões bíblicas profundas
  const connectedEntries = entries.filter((e) => e.ai_connections && e.ai_connections.length > 0);
  if (connectedEntries.length > 0 && Math.random() < 0.6) {
    const randomEntry = connectedEntries[Math.floor(Math.random() * connectedEntries.length)];
    const connection = randomEntry.ai_connections![0];
    const verseText = connection.verse_text
      ? connection.verse_text.length > 90
        ? `${connection.verse_text.slice(0, 87)}…`
        : connection.verse_text
      : '';

    return {
      title: `Palavra ao Seu Coração · ${connection.reference}`,
      body: verseText
        ? `“${verseText}” — Conectado ao seu marco de fé.`
        : `Releia a conexão do Senhor com o seu marco "${randomEntry.title || 'de fé'}".`,
      entryId: randomEntry.id,
      category: randomEntry.category,
    };
  }

  // 3. Marcos com data marcante ou marcos gerais (Ebenezer)
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const picked = sorted[Math.floor(Math.random() * Math.min(sorted.length, 5))];
  const excerpt = picked.content.length > 100 ? `${picked.content.slice(0, 95)}…` : picked.content;

  const headerRef = picked.bible_ref?.display ? ` · ${picked.bible_ref.display}` : '';

  return {
    title: `Marco de Fé Revisitado${headerRef}`,
    body: `“${excerpt}” — Até aqui nos ajudou o Senhor.`,
    entryId: picked.id,
    category: picked.category,
  };
}

// ─── 6. Agendamento Local Diário ──────────────────────────────────────────────

/**
 * Agenda o lembrete diário no horário escolhido pelo leitor.
 */
export async function scheduleDailyMemorialReminder(
  timeStr: string,
  entries: MemorialEntry[]
): Promise<string | null> {
  try {
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return null;

    await setupNotificationChannel();

    // Cancela agendamentos anteriores
    await cancelDailyMemorialReminder();

    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10) || 8;
    const minute = parseInt(minuteStr, 10) || 0;

    const reminder = generateDailyMemorialReminder(entries);

    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDENTIFIER_DAILY,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        color: '#D9B463',
        data: {
          type: 'memorial_reminder',
          entryId: reminder.entryId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(isRunningInExpoGo() ? {} : { channelId: MEMORIAL_CHANNEL_ID }),
      },
    });

    console.log(`[NotificationService] Lembrete diário agendado para ${timeStr} (ID: ${identifier})`);
    return identifier;
  } catch (err: any) {
    console.log('[NotificationService] Falha ao agendar lembrete diário:', err?.message || err);
    return null;
  }
}

/**
 * Cancela a notificação diária agendada.
 */
export async function cancelDailyMemorialReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDENTIFIER_DAILY);
    console.log('[NotificationService] Lembrete diário cancelado.');
  } catch {}
}

/**
 * Dispara uma notificação de teste imediata (em 2 segundos) para o usuário
 * ver o design, o tom contemplativo e a chegada no aparelho.
 */
export async function triggerInstantTestReminder(entries: MemorialEntry[]): Promise<boolean> {
  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return false;

    await setupNotificationChannel();
    const reminder = generateDailyMemorialReminder(entries);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        color: '#D9B463',
        data: {
          type: 'memorial_reminder',
          entryId: reminder.entryId,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
        ...(isRunningInExpoGo() ? {} : { channelId: MEMORIAL_CHANNEL_ID }),
      },
    });

    return true;
  } catch (err: any) {
    console.log('[NotificationService] Erro ao disparar teste:', err?.message || err);
    return false;
  }
}

/**
 * Dispara notificação nativa imediata de acolhimento e apoio à vida no aparelho.
 * Funciona mesmo se o usuário fechar o aplicativo ou bloquear o celular.
 */
export async function scheduleAtalaiaCrisisNotification(options: {
  noteId?: string;
  pastorName?: string;
  customTitle?: string;
  customBody?: string;
}): Promise<string | null> {
  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) {
      console.log('[NotificationService] Permissão de notificação não concedida para acolhimento Atalaia.');
      return null;
    }

    await setupNotificationChannel();

    const pastorPart = options.pastorName?.trim()
      ? ` ou falar com o Pr. ${options.pastorName.trim()}`
      : '';

    const title = options.customTitle || 'Você não está sozinho · Memorial Atalaia';
    const body =
      options.customBody ||
      `Estamos com você neste momento. Toque para ver canais de apoio, ligar para o CVV 188${pastorPart}.`;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        color: '#E7B075',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'atalaia_crisis',
          noteId: options.noteId,
          pastorName: options.pastorName,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
        ...(isRunningInExpoGo() ? {} : { channelId: ATALAIA_CHANNEL_ID }),
      },
    });

    console.log(`[NotificationService] Notificação de acolhimento Atalaia enviada ao sistema (ID: ${identifier})`);
    return identifier;
  } catch (err: any) {
    console.log('[NotificationService] Erro ao disparar notificação nativa de acolhimento Atalaia:', err?.message || err);
    return null;
  }
}

// ─── 7. Listener de Toque na Notificação ──────────────────────────────────────

type NotificationTapHandler = (entryId: string) => void;
let globalTapHandler: NotificationTapHandler | null = null;

export function setNotificationNavigationHandler(handler: NotificationTapHandler) {
  globalTapHandler = handler;
}

export function subscribeToNotificationResponse(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    if (data?.type === 'atalaia_crisis') {
      try {
        const { triggerGlobalAtalaiaCrisis } = require('./atalaiaCrisisManager');
        triggerGlobalAtalaiaCrisis({
          noteId: data.noteId,
          pastorName: data.pastorName,
        });
      } catch (e) {
        console.log('[NotificationService] Erro ao acionar modal de crise via notificação:', e);
      }
      return;
    }

    if (typeof data?.entryId === 'string' && globalTapHandler) {
      globalTapHandler(data.entryId);
    }
  });

  return () => {
    subscription.remove();
  };
}
