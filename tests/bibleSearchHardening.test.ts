import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractBibleKeywords,
  searchLocalBibleFallback,
  searchBibleVerses,
} from '../src/lib/searchService';

describe('Busca Bíblica — Hardening de Consultas Curtas, Stop-Words sem Acento e Fallback Offline', () => {
  it('deve extrair palavras-chave de dúvidas curtas de 2–3 palavras sem ponto de interrogação', () => {
    const kw1 = extractBibleKeywords('servo sofredor');
    assert.deepStrictEqual(kw1, ['servo', 'sofredor']);

    const kw2 = extractBibleKeywords('fala sobre ansiedade');
    assert.deepStrictEqual(kw2, ['ansiedade']);

    const kw3 = extractBibleKeywords('passagem do perdao');
    assert.deepStrictEqual(kw3, ['perdao']);
  });

  it('deve remover stop-words mesmo quando digitadas sem acento', () => {
    const kw = extractBibleKeywords('onde esta na biblia o versiculo sobre ansiedade no capitulo');
    assert.deepStrictEqual(kw, ['ansiedade']);
  });

  it('deve preservar termos bíblicos curtos de 2 letras como "fé" e "Jó"', () => {
    const kwFe = extractBibleKeywords('o que e fe');
    assert.deepStrictEqual(kwFe, ['fe']);

    const kwJo = extractBibleKeywords('historia de Jo');
    assert.deepStrictEqual(kwJo, ['jo']);
  });

  it('deve preservar busca literal entre aspas explícitas retornando null em extractBibleKeywords', () => {
    assert.strictEqual(extractBibleKeywords('"servo sofredor"'), null);
  });

  it('deve localizar "O Senhor é meu pastor" no fallback offline apesar de artigo extra no texto ACF', () => {
    const results = searchLocalBibleFallback('O Senhor é meu pastor');
    assert.ok(results.length >= 1, 'Deve encontrar Salmos 23:1 offline');
    assert.strictEqual(results[0].reference, 'Salmos 23:1');
  });

  it('deve localizar versículos por dúvida curta sem acento no fallback offline', () => {
    const results = searchLocalBibleFallback('passagem paz entendimento');
    assert.ok(results.length >= 1, 'Deve encontrar Filipenses 4:7 offline');
    assert.strictEqual(results[0].reference, 'Filipenses 4:7');
  });

  it('deve acionar fallback offline automaticamente quando a API FTS estiver inacessível para dúvida curta', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network offline simulated');
    }) as any;

    try {
      const response = await searchBibleVerses('O Senhor é meu pastor');
      assert.ok(response.total >= 1);
      assert.strictEqual(response.results[0].reference, 'Salmos 23:1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
