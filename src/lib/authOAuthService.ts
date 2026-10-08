/**
 * authOAuthService.ts — Autenticação OAuth (Google) e Deep Linking no Memorial
 *
 * Contas Unificadas com Bíblia Vive (yqnsaslvxmqaeeccmcmg.supabase.co).
 * Gerencia o redirecionamento OAuth e a captura do token/código via deep link.
 */

import { Linking } from 'react-native';
import { supabase } from './supabase';
import {
  extractOAuthTokensFromUrl,
  extractOAuthCodeFromUrl,
  extractOAuthErrorFromUrl,
  DEFAULT_OAUTH_REDIRECT,
} from './authOAuthUtils';

export * from './authOAuthUtils';

export interface OAuthResult {
  success: boolean;
  error?: string;
  type?: 'session_restored' | 'code_exchanged' | 'error';
}

/**
 * Processa a URL de retorno do OAuth e estabelece a sessão no Supabase
 */
export async function handleAuthRedirectUrl(url: string): Promise<OAuthResult> {
  if (!url) {
    return { success: false, error: 'URL vazia ou inválida' };
  }

  // 1. Verifica se a URL contém erro retornado pelo provedor OAuth
  const oauthError = extractOAuthErrorFromUrl(url);
  if (oauthError) {
    console.warn('[authOAuthService] Erro retornado no callback OAuth:', oauthError);
    return {
      success: false,
      type: 'error',
      error: oauthError.includes('access_denied')
        ? 'Login com Google cancelado pelo usuário.'
        : `Erro na autenticação: ${oauthError}`,
    };
  }

  // 2. Extrai tokens de sessão no hash fragment (Fluxo Implicit)
  const tokens = extractOAuthTokensFromUrl(url);
  if (tokens) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      if (error) {
        console.warn('[authOAuthService] Erro ao restaurar sessão via setSession:', error.message);
        return { success: false, error: error.message, type: 'error' };
      }

      if (data?.session) {
        return { success: true, type: 'session_restored' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao salvar sessão', type: 'error' };
    }
  }

  // 3. Extrai código de autorização (Fluxo PKCE)
  const code = extractOAuthCodeFromUrl(url);
  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('[authOAuthService] Erro ao trocar code por sessão:', error.message);
        return { success: false, error: error.message, type: 'error' };
      }

      if (data?.session) {
        return { success: true, type: 'code_exchanged' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao validar código', type: 'error' };
    }
  }

  return { success: false, error: 'Nenhum token ou código de autenticação encontrado na URL' };
}

/**
 * Inicia o fluxo de autenticação com o Google OAuth
 */
export async function initiateGoogleOAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: DEFAULT_OAUTH_REDIRECT,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { success: false, error: 'Não foi possível conectar ao Google no momento.' };
    }

    if (data?.url) {
      const canOpen = await Linking.canOpenURL(data.url);
      if (canOpen) {
        await Linking.openURL(data.url);
        return { success: true };
      } else {
        return { success: false, error: 'Não foi possível abrir o navegador do dispositivo.' };
      }
    }

    return { success: false, error: 'Não foi possível iniciar o login com o Google.' };
  } catch {
    return { success: false, error: 'Não foi possível conectar ao Google no momento.' };
  }
}
