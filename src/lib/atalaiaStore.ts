/**
 * atalaiaStore.ts — Camada de Acesso a Dados do Atalaia (Bíblia Vive / Memorial)
 *
 * Gerencia contatos pastorais, alertas e emissão de telemetria cega
 * através do cliente Supabase, respeitando rigorosamente as políticas RLS.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  PastoralContact,
  PastoralAlert,
  CareTelemetryEvent,
  PastoralContactInput,
  validatePastoralContactInput,
  generateInvitationTokenData,
  sanitizeAlertAuditPayload,
  buildBlindTelemetryPayload,
  PastoralTriggerType,
  shouldEvaluateForCareTriage,
  shouldShowCareBanner,
  validateTriageResponse,
} from './atalaiaTypes';

/**
 * Busca o contato pastoral atual do Leitor.
 * Prioriza contato com status 'active', depois 'pending'.
 */
export async function fetchCurrentPastoralContact(): Promise<PastoralContact | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('pastoral_contacts')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[AtalaiaStore] Erro ao buscar contato pastoral:', error.message);
    return null;
  }

  return data as PastoralContact | null;
}

/**
 * Dispara convite para Contato de Cuidado pastoral (Edge Function com fallback no banco).
 */
export async function sendPastoralInvitation(
  input: PastoralContactInput
): Promise<{ success: boolean; contact?: PastoralContact; error?: string }> {
  const validation = validatePastoralContactInput(input);
  if (!validation.isValid || !validation.data) {
    return { success: false, error: validation.error };
  }

  // 1. Tentar despachar via Edge Function send-pastoral-invitation
  try {
    const { data, error } = await supabase.functions.invoke('send-pastoral-invitation', {
      body: {
        name: validation.data.name,
        email: validation.data.email,
        role: validation.data.role,
        requester_name: validation.data.requester_name,
      },
    });

    if (!error && data?.success && data?.contact) {
      return { success: true, contact: data.contact as PastoralContact };
    }
    if (error && error.message && !error.message.includes('Failed to send')) {
      console.warn('[AtalaiaStore] Edge Function retornou erro:', error.message);
    }
  } catch (fnErr) {
    console.warn('[AtalaiaStore] Edge Function offline ou não deployada, aplicando fallback:', fnErr);
  }

  // 2. Fallback resiliente direto no Supabase DB
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Sessão não autenticada.' };
  }

  const tokenData = generateInvitationTokenData();

  await supabase
    .from('pastoral_contacts')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('status', ['active', 'pending']);

  const { data, error } = await supabase
    .from('pastoral_contacts')
    .insert({
      user_id: user.id,
      name: validation.data.name,
      email: validation.data.email,
      role: validation.data.role,
      requester_name: validation.data.requester_name,
      status: 'pending',
      confirmation_token: tokenData.token,
      token_expires_at: tokenData.expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('[AtalaiaStore] Falha ao cadastrar contato:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, contact: data as PastoralContact };
}

/**
 * Reenvia convite pastoral com novo token e nova janela de 48h.
 */
export async function resendPastoralInvitation(
  contact: PastoralContact
): Promise<{ success: boolean; contact?: PastoralContact; error?: string }> {
  return sendPastoralInvitation({
    name: contact.name,
    email: contact.email,
    role: contact.role,
    requesterName: contact.requester_name,
  });
}

/**
 * Cria ou substitui o contato pastoral do Leitor com status 'pending' (compatibilidade).
 */
export const registerPastoralContact = sendPastoralInvitation;

/**
 * Revoga imediatamente a autorização do contato pastoral.
 */
export async function revokePastoralContact(
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autenticado.' };

  const { error } = await supabase
    .from('pastoral_contacts')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[AtalaiaStore] Falha ao revogar contato:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Busca histórico técnico dos sinais e pedidos de ajuda enviados pelo Leitor.
 */
export async function fetchPastoralAlertHistory(): Promise<PastoralAlert[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('pastoral_alerts')
    .select('id, user_id, contact_id, trigger_type, note_id, sent_at, delivery_status, created_at')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false });

  if (error) {
    console.warn('[AtalaiaStore] Falha ao carregar histórico de alertas:', error.message);
    return [];
  }

  return (data || []) as PastoralAlert[];
}

/**
 * Emite evento de Telemetria Cega (ADR 0001).
 * Nunca transmite user_id, email ou hash.
 */
export async function emitBlindCareTelemetry(hasCareContact: boolean): Promise<void> {
  try {
    const payload = buildBlindTelemetryPayload({
      hasCareContact,
      platform: 'android', // No runtime móvel, React Native Platform.OS
    });

    const { error } = await supabase.from('care_telemetry_events').insert({
      has_care_contact: payload.has_care_contact,
      platform: payload.platform,
      created_at: payload.created_at,
    });

    if (error) {
      console.warn('[AtalaiaStore] Aviso na telemetria cega (silencioso):', error.message);
    }
  } catch (err) {
    // Falha em telemetria nunca pode travar o app do usuário
    console.warn('[AtalaiaStore] Exceção na telemetria cega:', err);
  }
}

const CARE_BANNER_DISMISS_KEY = '@memorial_care_banner_dismissed_at';

/**
 * Registra a dispensa do banner de cuidado localmente para aplicar o cooldown de 24h.
 */
export async function dismissCareBanner(): Promise<void> {
  try {
    await AsyncStorage.setItem(CARE_BANNER_DISMISS_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('[AtalaiaStore] Erro ao persistir dispensa do banner:', e);
  }
}

/**
 * Verifica se o banner de cuidado pode ser exibido respeitando o cooldown local.
 */
export async function canShowCareBanner(): Promise<boolean> {
  try {
    const lastDismissed = await AsyncStorage.getItem(CARE_BANNER_DISMISS_KEY);
    return shouldShowCareBanner(lastDismissed);
  } catch {
    return true;
  }
}

/**
 * Avalia um registro na Triagem de Cuidado no servidor (Edge Function care-triage).
 * Aplica o filtro de 48h para rascunhos offline antes de realizar qualquer chamada.
 */
export async function evaluateCareTriage(entry: {
  text: string;
  createdAt: string;
  category?: string;
}): Promise<boolean> {
  // 1. Filtro de 48h para rascunhos sincronizados offline
  if (!shouldEvaluateForCareTriage(entry.createdAt)) {
    return false;
  }

  // 2. Chamar Edge Function care-triage
  try {
    const { data, error } = await supabase.functions.invoke('care-triage', {
      body: {
        text: entry.text,
        category: entry.category,
        platform: Platform.OS || 'android',
      },
    });

    if (error) {
      console.warn('[AtalaiaStore] Erro ao invocar care-triage:', error.message);
      return false;
    }

    const validated = validateTriageResponse(data);
    if (!validated.isValid) {
      console.warn('[AtalaiaStore] Resposta de triagem rejeitada por violar invariante:', validated.error);
      return false;
    }

    return validated.eligible;
  } catch (err) {
    console.warn('[AtalaiaStore] Falha de rede ao consultar care-triage:', err);
    return false;
  }
}

