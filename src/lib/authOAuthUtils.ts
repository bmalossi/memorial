/**
 * authOAuthUtils.ts — Utilitários puros de OAuth e Integração Bíblia Vive
 *
 * Contas Unificadas com Bíblia Vive (yqnsaslvxmqaeeccmcmg.supabase.co).
 * Funções puras sem dependência direta do runtime React Native.
 */

export const MEMORIAL_AUTH_BRIDGE_URL = 'https://bibliavive.com.br/memorial/auth/callback';

export const OAUTH_REDIRECT_SCHEMES = [
  MEMORIAL_AUTH_BRIDGE_URL,
  'memorial://auth/callback',
  'exp+memorial-app://auth/callback',
] as const;

export const DEFAULT_OAUTH_REDIRECT = MEMORIAL_AUTH_BRIDGE_URL;

export const PASTORAL_ONBOARDING_DISMISS_KEY = '@memorial_pastoral_onboarding_dismissed_at';
export const PASTORAL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/**
 * Extrai tokens de hash (#access_token=...&refresh_token=...)
 */
export function extractOAuthTokensFromUrl(url: string): OAuthTokens | null {
  if (!url) return null;

  try {
    const hashIndex = url.indexOf('#');
    const queryString = hashIndex !== -1 ? url.substring(hashIndex + 1) : (url.includes('?') ? url.split('?')[1] : '');
    if (!queryString) return null;

    const params = new URLSearchParams(queryString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const expiresIn = params.get('expires_in');
      return {
        accessToken,
        refreshToken,
        expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
      };
    }
  } catch (err) {
    console.warn('[authOAuthUtils] Erro ao extrair tokens da URL:', err);
  }

  return null;
}

/**
 * Extrai o código PKCE de autorização (?code=...)
 */
export function extractOAuthCodeFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return null;

    const queryString = url.substring(queryIndex + 1).split('#')[0];
    const params = new URLSearchParams(queryString);
    return params.get('code');
  } catch (err) {
    console.warn('[authOAuthUtils] Erro ao extrair code da URL:', err);
    return null;
  }
}

/**
 * Extrai mensagem de erro de OAuth da URL caso o usuário cancele ou ocorra falha
 */
export function extractOAuthErrorFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const fullParamsString = url.includes('?')
      ? url.split('?')[1]
      : (url.includes('#') ? url.split('#')[1] : '');

    const params = new URLSearchParams(fullParamsString);
    const errorDesc = params.get('error_description') || params.get('error');

    if (errorDesc) {
      return decodeURIComponent(errorDesc.replace(/\+/g, ' '));
    }
  } catch {
    // silencioso
  }

  return null;
}

/**
 * Verifica se a dispensa da notificação pastoral ainda está dentro do período de cooldown
 */
export function isPastoralOnboardingWithinCooldown(dismissedTimestampMs: number, nowMs: number = Date.now()): boolean {
  if (!dismissedTimestampMs || isNaN(dismissedTimestampMs)) return false;
  return (nowMs - dismissedTimestampMs) < PASTORAL_DISMISS_COOLDOWN_MS;
}
