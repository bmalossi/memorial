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
  getSavedCredentials,
  saveCredentials,
  clearSavedCredentials,
  REMEMBER_CREDENTIALS_KEY,
  SAVED_EMAIL_KEY,
  SAVED_PASSWORD_KEY,
} from '../src/lib/authCredentialsStore';

describe('Auth Credentials Store (Lembrar Credenciais na Tela de Login)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deve retornar credenciais vazias quando nada foi salvo previamente', async () => {
    const creds = await getSavedCredentials();
    assert.strictEqual(creds.remember, false);
    assert.strictEqual(creds.email, '');
    assert.strictEqual(creds.password, '');
  });

  it('deve salvar e-mail e senha quando o usuário opta por lembrar', async () => {
    await saveCredentials('usuario@bibliavive.com.br', 'minhasenha123');

    const creds = await getSavedCredentials();
    assert.strictEqual(creds.remember, true);
    assert.strictEqual(creds.email, 'usuario@bibliavive.com.br');
    assert.strictEqual(creds.password, 'minhasenha123');

    // Valida armazenamento sob chaves canônicas
    const rememberVal = await AsyncStorage.getItem(REMEMBER_CREDENTIALS_KEY);
    const emailVal = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
    const passVal = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);

    assert.strictEqual(rememberVal, 'true');
    assert.strictEqual(emailVal, 'usuario@bibliavive.com.br');
    assert.strictEqual(passVal, 'minhasenha123');
  });

  it('deve limpar credenciais quando o usuário desmarca a opção', async () => {
    await saveCredentials('usuario@bibliavive.com.br', 'minhasenha123');
    await clearSavedCredentials();

    const creds = await getSavedCredentials();
    assert.strictEqual(creds.remember, false);
    assert.strictEqual(creds.email, '');
    assert.strictEqual(creds.password, '');
  });

  it('deve aparar espaços em branco do e-mail ao salvar', async () => {
    await saveCredentials('   membro@bibliavive.com.br   ', 'segredo456');

    const creds = await getSavedCredentials();
    assert.strictEqual(creds.email, 'membro@bibliavive.com.br');
  });
});
