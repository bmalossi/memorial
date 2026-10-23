/**
 * secureStorage.ts - Memorial
 *
 * Armazenamento criptografado (Keychain iOS / Keystore Android) via expo-secure-store,
 * usado para dados de autenticacao (sessao Supabase e senha lembrada).
 *
 * - O SecureStore limita ~2KB por valor, entao valores grandes (ex.: sessao JWT) sao
 *   divididos em blocos.
 * - Migra automaticamente valores legados do AsyncStorage (texto puro) na primeira leitura,
 *   sem deslogar o usuario, e apaga a copia insegura.
 * - Em Node (testes) cai para AsyncStorage, pois nao ha Keychain/Keystore.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800;
const isNode = typeof process !== 'undefined' && !!process.versions?.node;

/** Armazenamento in-memory usado exclusivamente em testes Node.js. */
const _nodeStore = new Map<string, string>();
const nodeStorage = {
  getItem: async (key: string) => _nodeStore.get(key) ?? null,
  setItem: async (key: string, value: string) => { _nodeStore.set(key, value); },
  removeItem: async (key: string) => { _nodeStore.delete(key); },
};

/**
 * Limpa o store in-memory de testes Node.
 * Chamar no `beforeEach` de testes que usam secureStorage.
 * NÃO tem efeito em produção (SecureStore real) nem em builds nativos.
 */
export function clearSecureStoreForTests(): void {
  _nodeStore.clear();
}

let SecureStore: typeof import('expo-secure-store') | null = null;
if (!isNode) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SecureStore = require('expo-secure-store');
  } catch {
    SecureStore = null;
  }
}

export const isSecureStorageAvailable = !isNode && SecureStore !== null;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

/** Retorna o storage de plataforma correto. */
function platformStorage() {
  if (isNode) return nodeStorage;
  return AsyncStorage;
}

async function secureGet(key: string): Promise<string | null> {
  if (!SecureStore) return platformStorage().getItem(key);
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  if (countRaw === null) return null;
  const count = parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count < 0) return null;
  let out = '';
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part === null) return null;
    out += part;
  }
  return out;
}

async function secureRemove(key: string): Promise<void> {
  if (!SecureStore) return platformStorage().removeItem(key);
  const countRaw = await SecureStore.getItemAsync(countKey(key));
  const count = countRaw ? parseInt(countRaw, 10) || 0 : 0;
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!SecureStore) return platformStorage().setItem(key, value);
  await secureRemove(key);
  const chunks = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  for (let i = 0; i < chunks; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(countKey(key), String(chunks));
}

/**
 * Interface compativel com o `storage` do supabase-js e com AsyncStorage.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const value = await secureGet(key);
    if (value !== null || !SecureStore) return value;

    // Migracao: valor legado em texto puro no AsyncStorage
    const legacy = await platformStorage().getItem(key);
    if (legacy !== null) {
      await secureSet(key, legacy);
      await platformStorage().removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    await secureSet(key, value);
    if (SecureStore) await platformStorage().removeItem(key);
  },
  async removeItem(key: string): Promise<void> {
    await secureRemove(key);
    if (SecureStore) await platformStorage().removeItem(key);
  },
};
