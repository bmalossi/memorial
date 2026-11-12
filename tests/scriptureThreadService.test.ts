import { describe, it } from 'node:test';
import assert from 'node:assert';
import { queryScriptureThread } from '../src/lib/scriptureThreadService';
import { ScripturePassageData } from '../src/components/bible/ScriptureResultCard';
import { BibleSearchResult } from '../src/lib/searchService';

describe('Scripture Thread Service — Consulta Bíblica Direta ("No AI Slop" & Confidence Gate)', () => {
  const samplePassage: ScripturePassageData = {
    reference: 'Mateus 1:1-17',
    book_name: 'Mateus',
    book_slug: 'mt',
    chapter: 1,
    start_verse: 1,
    end_verse: 17,
    version: 'acf',
    verses: [
      { verse: 1, text: 'Livro da geração de Jesus Cristo, filho de Davi, filho de Abraão.' },
      { verse: 2, text: 'Abraão gerou a Isaque; e Isaque gerou a Jacó; e Jacó gerou a Judá e a seus irmãos;' },
    ],
  };

  const sampleFallbackResults: BibleSearchResult[] = [
    {
      id: 'mt-1-1',
      reference: 'Mateus 1:1',
      bookName: 'Mateus',
      bookSlug: 'mt',
      chapter: 1,
      verse: 1,
      text: 'Livro da geração de Jesus Cristo, filho de Davi, filho de Abraão.',
    },
  ];

  it('deve retornar direct_passage quando a Edge Function responder status matched com confidence >= 0.80', async () => {
    const mockInvoker = async () => ({
      data: {
        status: 'matched',
        confidence: 0.94,
        passage: samplePassage,
      },
      error: null,
    });

    const result = await queryScriptureThread('Qual passagem mostra a genealogia de Jesus?', {
      customInvoker: mockInvoker,
    });

    assert.strictEqual(result.type, 'direct_passage');
    if (result.type === 'direct_passage') {
      assert.strictEqual(result.passage.reference, 'Mateus 1:1-17');
      assert.strictEqual(result.passage.version, 'acf');
      assert.strictEqual(result.passage.verses.length, 2);
      assert.strictEqual(result.confidence, 0.94);
    }
  });

  it('deve acionar o fallback transparente quando a Edge Function responder status unclear', async () => {
    let fallbackCalled = false;

    const mockInvoker = async () => ({
      data: {
        status: 'unclear',
      },
      error: null,
    });

    const mockFallback = async (q: string) => {
      fallbackCalled = true;
      assert.strictEqual(q, 'pergunta sem passagem direta');
      return { results: sampleFallbackResults, total: 1 };
    };

    const result = await queryScriptureThread('pergunta sem passagem direta', {
      customInvoker: mockInvoker,
      customFallback: mockFallback,
    });

    assert.strictEqual(fallbackCalled, true, 'O fallback por palavras-chave deve ser chamado');
    assert.strictEqual(result.type, 'keyword_results');
    if (result.type === 'keyword_results') {
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].reference, 'Mateus 1:1');
    }
  });

  it('deve acionar o fallback transparente em caso de erro HTTP ou falha de rede na Edge Function', async () => {
    let fallbackCalled = false;

    const mockInvoker = async () => ({
      data: null,
      error: new Error('Network timeout ou 500 Internal Server Error'),
    });

    const mockFallback = async () => {
      fallbackCalled = true;
      return { results: sampleFallbackResults, total: 1 };
    };

    const result = await queryScriptureThread('qualquer dúvida bíblica', {
      customInvoker: mockInvoker,
      customFallback: mockFallback,
    });

    assert.strictEqual(fallbackCalled, true);
    assert.strictEqual(result.type, 'keyword_results');
  });

  it('deve retornar resultado vazio quando a consulta for vazia ou apenas espaços', async () => {
    const result = await queryScriptureThread('   ');
    assert.strictEqual(result.type, 'keyword_results');
    if (result.type === 'keyword_results') {
      assert.deepStrictEqual(result.results, []);
      assert.strictEqual(result.total, 0);
    }
  });

  it('Invariante Sagrada: o resultado direct_passage nunca deve conter preâmbulos conversacionais ou texto de IA', async () => {
    const mockInvoker = async () => ({
      data: {
        status: 'matched',
        confidence: 0.95,
        passage: samplePassage,
      },
      error: null,
    });

    const result = await queryScriptureThread('genealogia de Jesus', {
      customInvoker: mockInvoker,
    });

    assert.strictEqual(result.type, 'direct_passage');
    if (result.type === 'direct_passage') {
      for (const v of result.passage.verses) {
        assert.ok(!v.text.includes('Aqui está'), 'Não pode conter preâmbulo de IA');
        assert.ok(!v.text.includes('Espero que ajude'), 'Não pode conter despedida de IA');
        assert.ok(!v.text.includes('Olá'), 'Não pode conter saudação');
      }
    }
  });
});
