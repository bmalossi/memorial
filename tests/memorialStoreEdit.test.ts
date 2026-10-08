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
  updateUserMemorial,
  fetchUserMemorials,
} from '../src/lib/memorialStore';
import { MemorialEntry } from '../src/lib/types';

describe('Edição Completa de Memórias Espirituais (updateUserMemorial)', () => {
  const STORAGE_KEY_ENTRIES = '@memorial_cache_entries_v2';
  const STORAGE_KEY_PENDING = '@memorial_pending_queue_v2';

  const mockEntry: MemorialEntry = {
    id: 'local_test_12345',
    title: 'Título Original de Fé',
    content: 'Conteúdo original antes da edição.',
    category: 'reflexao',
    created_at: '2026-05-10T10:00:00.000Z',
    tags: ['paz', 'esperanca'],
    bible_ref: {
      book: 'Salmos',
      slug: 'sl',
      chapter: 23,
      verse: 1,
      display: 'Salmos 23:1',
    },
    sync_status: 'synced',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([mockEntry]));
    await AsyncStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify([]));
  });

  it('deve atualizar campos de texto, categoria, tags e referência bíblica mantendo id e created_at imutáveis', async () => {
    const updated = await updateUserMemorial('local_test_12345', {
      title: 'Título Renovado',
      content: 'Relato aprofundado com novos detalhes da intervenção divina.',
      category: 'testemunho',
      tags: ['gratidao', 'vitoria'],
      bible_ref: {
        book: 'Filipenses',
        slug: 'fp',
        chapter: 4,
        verse: 13,
        display: 'Filipenses 4:13',
      },
    });

    assert.strictEqual(updated.id, 'local_test_12345');
    assert.strictEqual(updated.created_at, '2026-05-10T10:00:00.000Z');
    assert.strictEqual(updated.title, 'Título Renovado');
    assert.strictEqual(updated.content, 'Relato aprofundado com novos detalhes da intervenção divina.');
    assert.strictEqual(updated.category, 'testemunho');
    assert.deepStrictEqual(updated.tags, ['gratidao', 'vitoria']);
    assert.strictEqual(updated.bible_ref?.display, 'Filipenses 4:13');
  });

  it('deve refletir a alteração no cache local do AsyncStorage imediatamente', async () => {
    await updateUserMemorial('local_test_12345', {
      title: 'Título Atualizado no Cache',
      category: 'oracao',
    });

    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY_ENTRIES);
    assert.ok(cachedRaw);
    const cachedList: MemorialEntry[] = JSON.parse(cachedRaw);
    const item = cachedList.find((e) => e.id === 'local_test_12345');

    assert.ok(item);
    assert.strictEqual(item?.title, 'Título Atualizado no Cache');
    assert.strictEqual(item?.category, 'oracao');
  });

  it('deve enfileirar ação de update na fila offline para sincronização', async () => {
    await updateUserMemorial('local_test_12345', {
      content: 'Alteração em modo offline.',
    });

    const pendingRaw = await AsyncStorage.getItem(STORAGE_KEY_PENDING);
    assert.ok(pendingRaw);
    const queue = JSON.parse(pendingRaw);
    const pendingAction = queue.find((q: any) => q.id === 'local_test_12345');

    assert.ok(pendingAction);
    assert.strictEqual(pendingAction.action, 'update');
    assert.strictEqual(pendingAction.entry.content, 'Alteração em modo offline.');
  });

  it('deve lançar erro caso o id não exista no cache local', async () => {
    await assert.rejects(
      async () => {
        await updateUserMemorial('id_inexistente_999', {
          title: 'Tentativa Inválida',
        });
      },
      {
        message: 'Marco não encontrado no cache local.',
      }
    );
  });
});
