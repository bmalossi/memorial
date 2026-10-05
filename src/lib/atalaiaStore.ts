/**
 * atalaiaStore.ts — Camada de Acesso a Dados do Atalaia (Bíblia Vive / Memorial)
 *
 * Gerencia contatos pastorais, alertas e emissão de telemetria cega
 * através do cliente Supabase, respeitando rigorosamente as políticas RLS.
 */

import { supabase } from './supabase';
import {
  PastoralContact,
  PastoralAlert,
  CareTelemetryEvent,
  PastoralContactInput,
  validatePastoralContactInput,
  sanitizeAlertAuditPayload,
  buildBlindTelemetryPayload,
  PastoralTriggerType,
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
 * Cria ou substitui o contato pastoral do Leitor com status 'pending'.
 * Se houver um contato ativo anterior, revoga-o antes para manter a integridade.
 */
export async function registerPastoralContact(
  input: PastoralContactInput
): Promise<{ success: boolean; contact?: PastoralContact; error?: string }> {
  const validation = validatePastoralContactInput(input);
  if (!validation.isValid || !validation.data) {
    return { success: false, error: validation.error };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Sessão não autenticada.' };
  }

  // 1. Revogar contatos ativos ou pendentes anteriores do usuário
  await supabase
    .from('pastoral_contacts')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('status', ['active', 'pending']);

  // 2. Inserir o novo contato em estado 'pending'
  const { data, error } = await supabase
    .from('pastoral_contacts')
    .insert({
      user_id: user.id,
      name: validation.data.name,
      email: validation.data.email,
      role: validation.data.role,
      requester_name: validation.data.requester_name,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[AtalaiaStore] Falha ao cadastrar contato:', error.message);
    return { success: false, error: 'Falha ao salvar contato pastoral.' };
  }

  return { success: true, contact: data as PastoralContact };
}

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
