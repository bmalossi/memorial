/**
 * atalaiaStore.ts — Camada de Acesso a Dados do Atalaia (Bíblia Vive / Memorial)
 *
 * Gerencia contatos pastorais, alertas e emissão de telemetria cega
 * através do cliente Supabase, respeitando rigorosamente as políticas RLS.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { PastoralIntent } from './types';
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
 * Identifica se a sessão atual pertence a um Administrador
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const sessionRes = await supabase.auth.getSession();
    const user = sessionRes.data?.session?.user || (await supabase.auth.getUser()).data?.user;
    if (!user) return false;
    const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role;
    const email = user.email?.toLowerCase().trim();
    return role === 'admin' || email === 'contato@automab.dev';
  } catch {
    return false;
  }
}

/**
 * Limpa qualquer trava local de banner de cuidado (útil para testes imediatos)
 */
export async function clearCareBannerDismissal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CARE_BANNER_DISMISS_KEY);
  } catch (e) {
    console.warn('[AtalaiaStore] Erro ao limpar dispensa do banner:', e);
  }
}

/**
 * Registra a dispensa do banner de cuidado localmente para aplicar o cooldown de 24h.
 * Administradores não recebem trava persistente para permitir testes sucessivos.
 */
export async function dismissCareBanner(): Promise<void> {
  try {
    if (await isAdminUser()) {
      await AsyncStorage.removeItem(CARE_BANNER_DISMISS_KEY);
      return;
    }
    await AsyncStorage.setItem(CARE_BANNER_DISMISS_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('[AtalaiaStore] Erro ao persistir dispensa do banner:', e);
  }
}

/**
 * Verifica se o banner de cuidado pode ser exibido respeitando o cooldown local.
 * Administradores sempre podem visualizar o banner para fins de validação e teste.
 */
export async function canShowCareBanner(): Promise<boolean> {
  try {
    if (await isAdminUser()) {
      return true;
    }
    const lastDismissed = await AsyncStorage.getItem(CARE_BANNER_DISMISS_KEY);
    return shouldShowCareBanner(lastDismissed);
  } catch {
    return true;
  }
}

/**
 * Avalia um registro na Triagem de Cuidado no servidor (Edge Function care-triage).
 * Aplica o filtro de 48h para rascunhos offline antes de realizar qualquer chamada (ignorado para administradores).
 */
export async function evaluateCareTriage(entry: {
  text: string;
  createdAt: string;
  category?: string;
}): Promise<boolean> {
  const isAdmin = await isAdminUser();

  // 1. Filtro de 48h para rascunhos sincronizados offline (ignorado para Admin em modo de teste)
  if (!isAdmin && !shouldEvaluateForCareTriage(entry.createdAt)) {
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

/**
 * Dispara um Sinal de Cuidado consentido para o pastor (Edge Function send-pastoral-alert).
/**
 * Extrai e higieniza mensagens de resposta das Edge Functions,
 * garantindo que detalhes técnicos internos (como códigos de status, nomes de função ou traces)
 * nunca sejam exibidos ao usuário final.
 */
async function extractPastoralErrorMessage(
  error: any,
  defaultMessage: string
): Promise<{ rateLimited: boolean; message: string }> {
  let bodyData: any = null;
  try {
    if (error && typeof error === 'object' && 'context' in error && typeof error.context?.json === 'function') {
      bodyData = await error.context.json();
    }
  } catch {
    // context indisponível ou resposta não JSON
  }

  if (bodyData?.error === 'rate_limited' || error?.message?.includes('rate_limited') || error?.message?.includes('429')) {
    return {
      rateLimited: true,
      message: bodyData?.message || 'Um aviso já foi compartilhado recentemente. Respeitamos a janela pastoral.',
    };
  }

  if (bodyData?.error === 'no_active_contact') {
    return {
      rateLimited: false,
      message: 'Você ainda não possui um pastor ativo cadastrado para receber notificações.',
    };
  }

  // Se o servidor retornou uma mensagem clara em linguagem natural que não contenha jargão técnico
  if (
    bodyData?.message &&
    typeof bodyData.message === 'string' &&
    !bodyData.message.toLowerCase().includes('edge function') &&
    !bodyData.message.toLowerCase().includes('status code')
  ) {
    return {
      rateLimited: false,
      message: bodyData.message,
    };
  }

  return {
    rateLimited: false,
    message: defaultMessage,
  };
}

/**
 * Dispara um Sinal de Cuidado consentido para o pastor (Edge Function send-pastoral-alert).
 * Valida autorização ativa e rate limiting (7 dias / 48 horas) no servidor.
 */
export async function sendPastoralCareSignal(params: {
  noteId?: string | null;
}): Promise<{ success: boolean; rateLimited?: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-pastoral-alert', {
      body: {
        trigger_type: 'care_signal',
        note_id: params.noteId || null,
      },
    });

    if (error) {
      const parsed = await extractPastoralErrorMessage(
        error,
        'Não foi possível enviar o sinal no momento. Tente novamente mais tarde.'
      );
      return { success: false, rateLimited: parsed.rateLimited, message: parsed.message };
    }

    if (data?.error === 'rate_limited') {
      return {
        success: false,
        rateLimited: true,
        message: data.message || 'Um sinal já foi enviado recentemente. Respeitamos a janela pastoral.',
      };
    }

    return { success: Boolean(data?.success), message: data?.message };
  } catch (_err: any) {
    return { success: false, message: 'Não foi possível enviar o sinal no momento. Tente novamente mais tarde.' };
  }
}

/**
 * Dispara um Pedido Explícito de Ajuda direto para o pastor (Edge Function send-pastoral-alert).
 * Aplica trava de 24 horas no backend.
 */
export async function sendExplicitHelpRequest(): Promise<{
  success: boolean;
  rateLimited?: boolean;
  message?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('send-pastoral-alert', {
      body: {
        trigger_type: 'explicit_help',
      },
    });

    if (error) {
      const parsed = await extractPastoralErrorMessage(
        error,
        'Não foi possível enviar o pedido de amparo no momento. Tente novamente mais tarde.'
      );
      return { success: false, rateLimited: parsed.rateLimited, message: parsed.message };
    }

    if (data?.error === 'rate_limited') {
      return {
        success: false,
        rateLimited: true,
        message: data.message || 'Você já solicitou amparo hoje. Seu contato foi avisado.',
      };
    }

    return { success: Boolean(data?.success), message: data?.message };
  } catch (_err: any) {
    return { success: false, message: 'Não foi possível enviar o pedido de amparo no momento. Tente novamente mais tarde.' };
  }
}

/**
 * Dispara uma notificação do Ecossistema Completo de Cuidado Pastoral (4 Pilares)
 * (Edge Function send-pastoral-ecosystem-email via Resend).
 *
 * Pilares:
 * - 'CRISIS': Notificação solene de cobertura pastoral e oração.
 * - 'THEOLOGICAL_QUERY': Dúvida exegética ou passagem bíblica profunda.
 * - 'THANKSGIVING': Nota de vitória e gratidão a Deus para alegrar o ministério.
 * - 'ANSWERED_PRAYER': Testemunho de oração respondida e celebração comunitária.
 */
export async function sendPastoralEcosystemEmail(params: {
  type: PastoralIntent;
  noteId?: string | null;
  biblicalReference?: string | null;
}): Promise<{
  success: boolean;
  rateLimited?: boolean;
  message?: string;
  deliveryStatus?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('send-pastoral-ecosystem-email', {
      body: {
        type: params.type,
        note_id: params.noteId || null,
        biblical_reference: params.biblicalReference || null,
      },
    });

    if (error) {
      const parsed = await extractPastoralErrorMessage(
        error,
        'Não foi possível enviar a mensagem no momento. Tente novamente mais tarde.'
      );
      return { success: false, rateLimited: parsed.rateLimited, message: parsed.message };
    }

    if (data?.error === 'rate_limited') {
      return {
        success: false,
        rateLimited: true,
        message: data.message || 'Um aviso já foi compartilhado recentemente. Respeitamos a janela pastoral.',
      };
    }

    return {
      success: Boolean(data?.success),
      message: data?.message,
      deliveryStatus: data?.delivery_status,
    };
  } catch (_err: any) {
    return {
      success: false,
      message: 'Não foi possível enviar a mensagem no momento. Tente novamente mais tarde.',
    };
  }
}



