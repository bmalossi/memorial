// Polyfill window.localStorage para testes executados em ambiente Node.js / tsx
if (typeof (global as any).window === 'undefined') {
  const store = new Map<string, string>();
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    },
  };
}

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SLUG_TO_BOOK_ID,
  BOOK_ID_TO_SLUG,
  getBookIdFromSlug,
  getSlugFromBookId,
  recordChapterView,
  getLocalChapterViews,
  setLocalChapterViews,
  getVisitedChaptersForBook,
  isChapterVisited,
  clearChapterViewsForTesting,
} from '../src/lib/chapterReadingService';

describe('Bíblia Vive & Memorial — Serviço de Leitura e Destaque de Capítulos Lidos (Marcador Dourado)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearChapterViewsForTesting(['sl', 'gn', 'ex', 'mt', 'joa', 'ap']);
  });

  describe('Mapeamento Canônico de Slugs (Memorial) e IDs Bíblicos (Bíblia Vive)', () => {
    it('deve conter o mapeamento de todos os 66 livros bíblicos canônicos', () => {
      const keys = Object.keys(SLUG_TO_BOOK_ID);
      assert.strictEqual(keys.length, 66, 'Deve haver exatamente 66 livros mapeados');
    });

    it('deve mapear corretamente o slug de Salmos (sl -> psa)', () => {
      assert.strictEqual(getBookIdFromSlug('sl'), 'psa');
      assert.strictEqual(getSlugFromBookId('psa'), 'sl');
    });

    it('deve mapear corretamente o slug de Gênesis e Apocalipse', () => {
      assert.strictEqual(getBookIdFromSlug('gn'), 'gen');
      assert.strictEqual(getSlugFromBookId('gen'), 'gn');
      assert.strictEqual(getBookIdFromSlug('ap'), 'rev');
      assert.strictEqual(getSlugFromBookId('rev'), 'ap');
    });

    it('deve tratar espaços e maiúsculas de forma resiliente', () => {
      assert.strictEqual(getBookIdFromSlug('  SL  '), 'psa');
      assert.strictEqual(getBookIdFromSlug('GN'), 'gen');
      assert.strictEqual(getSlugFromBookId('  PSA '), 'sl');
    });

    it('deve retornar o próprio identificador caso o slug seja desconhecido', () => {
      assert.strictEqual(getBookIdFromSlug('desconhecido'), 'desconhecido');
      assert.strictEqual(getSlugFromBookId('custom_id'), 'custom_id');
    });
  });

  describe('Persistência e Leitura Local Imediata (AsyncStorage / Offline 0ms)', () => {
    it('deve retornar lista vazia de capítulos quando o livro não foi lido', async () => {
      const visited = await getVisitedChaptersForBook('sl');
      assert.deepStrictEqual(visited, []);

      const isVisited = await isChapterVisited('sl', 23);
      assert.strictEqual(isVisited, false);
    });

    it('deve registrar leitura de um capítulo e refletir instantaneamente em isChapterVisited', async () => {
      const readDate = new Date('2026-11-12T10:00:00.000Z');
      await recordChapterView('sl', 23, readDate);

      const is23Visited = await isChapterVisited('sl', 23);
      assert.strictEqual(is23Visited, true, 'Salmo 23 deve constar como lido');

      const is1Visited = await isChapterVisited('sl', 1);
      assert.strictEqual(is1Visited, false, 'Salmo 1 não foi lido ainda');

      const visitedList = await getVisitedChaptersForBook('sl');
      assert.deepStrictEqual(visitedList, [23]);
    });

    it('deve permitir múltiplos capítulos lidos do mesmo livro ordenados crescentemente', async () => {
      await recordChapterView('sl', 23);
      await recordChapterView('sl', 1);
      await recordChapterView('sl', 119);

      const visited = await getVisitedChaptersForBook('sl');
      assert.deepStrictEqual(visited, [1, 23, 119], 'Deve retornar capítulos ordenados numericamente');
    });

    it('deve isolar a leitura de livros distintos sem conflito de namespace', async () => {
      await recordChapterView('sl', 23);
      await recordChapterView('gn', 1);

      const salmos = await getVisitedChaptersForBook('sl');
      const genesis = await getVisitedChaptersForBook('gn');

      assert.deepStrictEqual(salmos, [23]);
      assert.deepStrictEqual(genesis, [1]);
    });

    it('deve atualizar o timestamp de leitura sem duplicar registros para o mesmo capítulo', async () => {
      const d1 = new Date('2026-11-10T12:00:00.000Z');
      const d2 = new Date('2026-11-12T15:30:00.000Z');

      await recordChapterView('sl', 23, d1);
      let localViews = await getLocalChapterViews('sl');
      assert.strictEqual(localViews[23], d1.toISOString());

      await recordChapterView('sl', 23, d2);
      localViews = await getLocalChapterViews('sl');
      assert.strictEqual(localViews[23], d2.toISOString());

      const visited = await getVisitedChaptersForBook('sl');
      assert.deepStrictEqual(visited, [23], 'Deve manter apenas uma entrada para o capítulo 23');
    });

    it('deve ignorar registros com parâmetros inválidos de capítulo ou slug', async () => {
      await recordChapterView('', 23);
      await recordChapterView('sl', 0);
      await recordChapterView('sl', -5);

      const visited = await getVisitedChaptersForBook('sl');
      assert.deepStrictEqual(visited, []);
    });
  });
});
