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
import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  extractOAuthTokensFromUrl,
  extractOAuthCodeFromUrl,
  extractOAuthErrorFromUrl,
  OAUTH_REDIRECT_SCHEMES,
  DEFAULT_OAUTH_REDIRECT,
  PASTORAL_ONBOARDING_DISMISS_KEY,
  isPastoralOnboardingWithinCooldown,
} from '../src/lib/authOAuthUtils';

describe('Autenticação Unificada Bíblia Vive & Google OAuth (authOAuthService)', () => {
  it('deve conter os esquemas de redirecionamento canônicos (ponte memorial, memorial e exp+memorial-app)', () => {
    assert.ok(OAUTH_REDIRECT_SCHEMES.includes('https://bibliavive.com.br/memorial/auth/callback'));
    assert.ok(OAUTH_REDIRECT_SCHEMES.includes('memorial://auth/callback'));
    assert.ok(OAUTH_REDIRECT_SCHEMES.includes('exp+memorial-app://auth/callback'));
    assert.strictEqual(DEFAULT_OAUTH_REDIRECT, 'https://bibliavive.com.br/memorial/auth/callback');
  });

  describe('Extração de Tokens do Hash Fragment (Fluxo Implicit)', () => {
    it('deve extrair access_token, refresh_token e expires_in de URL com hash', () => {
      const url = 'exp+memorial-app://auth/callback#access_token=jwt_token_abc&refresh_token=refresh_xyz&expires_in=3600&token_type=bearer';
      const tokens = extractOAuthTokensFromUrl(url);

      assert.notStrictEqual(tokens, null);
      assert.strictEqual(tokens?.accessToken, 'jwt_token_abc');
      assert.strictEqual(tokens?.refreshToken, 'refresh_xyz');
      assert.strictEqual(tokens?.expiresIn, 3600);
    });

    it('deve extrair tokens com esquema memorial://', () => {
      const url = 'memorial://auth/callback#access_token=token_custom_scheme&refresh_token=refresh_custom';
      const tokens = extractOAuthTokensFromUrl(url);

      assert.notStrictEqual(tokens, null);
      assert.strictEqual(tokens?.accessToken, 'token_custom_scheme');
      assert.strictEqual(tokens?.refreshToken, 'refresh_custom');
    });

    it('deve retornar null se tokens estiverem ausentes na URL', () => {
      assert.strictEqual(extractOAuthTokensFromUrl('memorial://auth/callback'), null);
      assert.strictEqual(extractOAuthTokensFromUrl(''), null);
      assert.strictEqual(extractOAuthTokensFromUrl('memorial://auth/callback#something_else=123'), null);
    });
  });

  describe('Extração de Código de Autorização (Fluxo PKCE)', () => {
    it('deve extrair code de query parameters', () => {
      const url = 'exp+memorial-app://auth/callback?code=pkce_auth_code_987&state=auth_state';
      const code = extractOAuthCodeFromUrl(url);

      assert.strictEqual(code, 'pkce_auth_code_987');
    });

    it('deve extrair code mesmo com hash anexo posterior', () => {
      const url = 'memorial://auth/callback?code=code_with_hash#section';
      const code = extractOAuthCodeFromUrl(url);

      assert.strictEqual(code, 'code_with_hash');
    });

    it('deve retornar null se code não estiver presente', () => {
      assert.strictEqual(extractOAuthCodeFromUrl('memorial://auth/callback?other=value'), null);
      assert.strictEqual(extractOAuthCodeFromUrl(''), null);
    });
  });

  describe('Extração de Mensagens de Erro OAuth', () => {
    it('deve extrair e decodificar descrição de erro amigável', () => {
      const url = 'memorial://auth/callback?error=access_denied&error_description=User+cancelled+the+sign-in+process';
      const errorMsg = extractOAuthErrorFromUrl(url);

      assert.strictEqual(errorMsg, 'User cancelled the sign-in process');
    });

    it('deve retornar null se não houver erro na URL', () => {
      assert.strictEqual(extractOAuthErrorFromUrl('memorial://auth/callback?code=valid'), null);
    });
  });

  describe('Detecção de Conta Existente vs Nova Conta (Email Enumeration Protection)', () => {
    it('deve identificar conta existente quando identities for array vazio', () => {
      const mockSupabaseResponse = {
        user: { id: 'user-123', email: 'test@example.com', identities: [] },
        session: null,
      };

      const isAlreadyRegistered =
        !!mockSupabaseResponse.user &&
        Array.isArray(mockSupabaseResponse.user.identities) &&
        mockSupabaseResponse.user.identities.length === 0;

      assert.strictEqual(isAlreadyRegistered, true);
    });

    it('deve identificar nova conta criada quando identities tiver ao menos 1 entrada', () => {
      const mockSupabaseResponse = {
        user: { id: 'new-user-456', email: 'novo@example.com', identities: [{ id: 'id-1' }] },
        session: null,
      };

      const isAlreadyRegistered =
        !!mockSupabaseResponse.user &&
        Array.isArray(mockSupabaseResponse.user.identities) &&
        mockSupabaseResponse.user.identities.length === 0;

      const isNewUserRequiringConfirmation =
        !isAlreadyRegistered &&
        !!mockSupabaseResponse.user &&
        !mockSupabaseResponse.session;

      assert.strictEqual(isAlreadyRegistered, false);
      assert.strictEqual(isNewUserRequiringConfirmation, true);
    });
  });
});

describe('Notificação Discreta de Cadastro Pastoral (PastoralOnboardingBanner)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deve gravar timestamp de dispensa no AsyncStorage ao fechar', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(PASTORAL_ONBOARDING_DISMISS_KEY, now.toString());

    const saved = await AsyncStorage.getItem(PASTORAL_ONBOARDING_DISMISS_KEY);
    assert.strictEqual(saved, now.toString());
  });

  it('deve respeitar cooldown de 7 dias após o usuário dispensar', async () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(PASTORAL_ONBOARDING_DISMISS_KEY, threeDaysAgo.toString());

    const stored = await AsyncStorage.getItem(PASTORAL_ONBOARDING_DISMISS_KEY);
    const timestamp = parseInt(stored || '0', 10);
    const isWithinCooldown = isPastoralOnboardingWithinCooldown(timestamp);

    assert.strictEqual(isWithinCooldown, true);
  });

  it('deve expirar o cooldown após 7 dias', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(PASTORAL_ONBOARDING_DISMISS_KEY, eightDaysAgo.toString());

    const stored = await AsyncStorage.getItem(PASTORAL_ONBOARDING_DISMISS_KEY);
    const timestamp = parseInt(stored || '0', 10);
    const isWithinCooldown = isPastoralOnboardingWithinCooldown(timestamp);

    assert.strictEqual(isWithinCooldown, false);
  });
});
