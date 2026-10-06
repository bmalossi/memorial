/**
 * authCredentialsStore.ts — Bíblia Vive / Memorial
 *
 * Gerenciamento de persistência local das credenciais de acesso do usuário.
 * Permite que o usuário opte por salvar seu e-mail e senha no dispositivo
 * para agilizar o próximo login.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const REMEMBER_CREDENTIALS_KEY = '@memorial_remember_credentials';
export const SAVED_EMAIL_KEY = '@memorial_saved_email';
export const SAVED_PASSWORD_KEY = '@memorial_saved_password';

export interface SavedCredentials {
  remember: boolean;
  email: string;
  password: string;
}

/**
 * Recupera as credenciais salvas no dispositivo.
 */
export async function getSavedCredentials(): Promise<SavedCredentials> {
  try {
    const [rememberVal, emailVal, passVal] = await Promise.all([
      AsyncStorage.getItem(REMEMBER_CREDENTIALS_KEY),
      AsyncStorage.getItem(SAVED_EMAIL_KEY),
      AsyncStorage.getItem(SAVED_PASSWORD_KEY),
    ]);

    const remember = rememberVal === 'true';
    return {
      remember,
      email: remember && emailVal ? emailVal : '',
      password: remember && passVal ? passVal : '',
    };
  } catch (err) {
    console.warn('[authCredentialsStore] Erro ao recuperar credenciais salvas:', err);
    return {
      remember: false,
      email: '',
      password: '',
    };
  }
}

/**
 * Salva as credenciais de acesso no dispositivo.
 */
export async function saveCredentials(email: string, password: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(REMEMBER_CREDENTIALS_KEY, 'true'),
      AsyncStorage.setItem(SAVED_EMAIL_KEY, email.trim()),
      AsyncStorage.setItem(SAVED_PASSWORD_KEY, password),
    ]);
  } catch (err) {
    console.warn('[authCredentialsStore] Erro ao salvar credenciais:', err);
  }
}

/**
 * Remove as credenciais salvas do dispositivo.
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(REMEMBER_CREDENTIALS_KEY),
      AsyncStorage.removeItem(SAVED_EMAIL_KEY),
      AsyncStorage.removeItem(SAVED_PASSWORD_KEY),
    ]);
  } catch (err) {
    console.warn('[authCredentialsStore] Erro ao limpar credenciais salvas:', err);
  }
}
