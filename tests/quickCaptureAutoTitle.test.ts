import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateAutoTitle } from '../src/lib/utils';

describe('Bottom-Docked Quick Capture — Geração de Títulos Automáticos (generateAutoTitle)', () => {
  const fixedDate = new Date(2026, 9, 8, 15, 30); // 08/10/2026 às 15:30

  it('deve gerar título com as primeiras palavras e a data quando houver texto curto', () => {
    const text = 'Paz em Cristo Jesus';
    const title = generateAutoTitle(text, fixedDate);
    assert.strictEqual(title, 'Paz em Cristo Jesus · 08/10');
  });

  it('deve abreviar com reticências quando o texto for longo e limitar às primeiras palavras', () => {
    const text = 'Hoje durante a oração senti uma profunda consolação sobre as decisões da semana';
    const title = generateAutoTitle(text, fixedDate);
    // Deve pegar as primeiras palavras elegantes sem cortar no meio
    assert.ok(title.includes('· 08/10'), 'Deve conter o sufixo de data');
    assert.ok(title.includes('…'), 'Deve conter reticências indicando continuidade');
    assert.ok(title.startsWith('Hoje durante a oração'), 'Deve iniciar com as primeiras palavras');
  });

  it('deve remover pontuações finais residuais antes das reticências', () => {
    const text = 'Deus ouviu meu clamor! Ele me respondeu com poder na madrugada.';
    const title = generateAutoTitle(text, fixedDate);
    assert.ok(!title.includes('!…'), 'Não deve deixar pontuação colada antes das reticências');
    assert.ok(title.includes('· 08/10'));
  });

  it('deve gerar fallback com data e hora caso o conteúdo seja vazio ou apenas espaços', () => {
    const emptyTitle = generateAutoTitle('', fixedDate);
    assert.strictEqual(emptyTitle, 'Memória · 08/10 às 15:30');

    const spacesTitle = generateAutoTitle('     \n\t   ', fixedDate);
    assert.strictEqual(spacesTitle, 'Memória · 08/10 às 15:30');
  });

  it('deve normalizar múltiplos espaços em branco entre palavras', () => {
    const messyText = 'Gratidão    pela   vida   e    saúde';
    const title = generateAutoTitle(messyText, fixedDate);
    assert.strictEqual(title, 'Gratidão pela vida e saúde · 08/10');
  });
});
