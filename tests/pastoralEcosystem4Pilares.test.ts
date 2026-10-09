import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPastoralIntentLocally,
  shouldShowPastoralActionBanner,
  getPastoralPillCopy,
  PastoralClassificationResult,
} from '../src/lib/classifierJEV';
import { PastoralIntent } from '../src/lib/types';

describe('Ecossistema Completo de Cuidado Pastoral (4 Pilares)', () => {
  const pastorName = 'Carlos Silveira';

  describe('Pilar 1: CRISIS (Dor, Desespero, Crise Espiritual, Luto)', () => {
    it('deve classificar relato de dor e esgotamento extremo como CRISIS com confiança >= 0.80', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Estou em desespero total, não aguento mais essa dor e angústia profunda na minha vida.',
        category: 'oracao',
      });

      assert.equal(result.intent, 'CRISIS');
      assert.ok(result.confidence >= 0.80, `Esperado >= 0.80, recebido ${result.confidence}`);
    });

    it('deve classificar ideação de desistência e vazio interior como CRISIS', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Sinto um vazio sem fim e uma vontade de desistir de tudo, sem forças para continuar.',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'CRISIS');
      assert.ok(result.confidence >= 0.80);
    });

    it('deve classificar relato de depressão, separação e perda de vontade de viver como CRISIS (relato real do usuário)', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Então, tô passando por um momento muito difícil, não sei o que fazer da minha vida. Separei da minha esposa, meus filhos foram levados por ela, tô sozinho, não sei o que fazer, não sei o que fazer da minha vida, não sei o que fazer da minha vida, estou perdido, não sei, não tô com mais vontade de viver.',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'CRISIS');
      assert.ok(result.confidence >= 0.95);
    });

    it('deve classificar relato contendo depressão e falta de sentido como CRISIS', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Estou com depressão profunda e não tenho mais vontade de viver.',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'CRISIS');
      assert.ok(result.confidence >= 0.95);
    });

    it('deve retornar a cópia exata da pílula de CRISIS', () => {
      const copy = getPastoralPillCopy('CRISIS', pastorName);
      assert.equal(
        copy.prompt,
        `Percebemos que seu dia está pesado. Quer enviar um sinal discreto de oração para o Pr. ${pastorName}?`
      );
      assert.equal(copy.buttonLabel, 'Avisar Pastor');
    });
  });

  describe('Pilar 2: THEOLOGICAL_QUERY (Reflexão Bíblica Profunda, Dúvida Exegética)', () => {
    it('deve classificar dúvida de estudo bíblico como THEOLOGICAL_QUERY com confiança >= 0.80', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Tenho uma dúvida de estudo sobre o contexto histórico e a exegese deste capítulo.',
        bible_ref: { book: 'Romanos', slug: 'rm', chapter: 9, verse: 15, display: 'Romanos 9:15' },
        category: 'reflexao',
      });

      assert.equal(result.intent, 'THEOLOGICAL_QUERY');
      assert.ok(result.confidence >= 0.80, `Esperado >= 0.80, recebido ${result.confidence}`);
      assert.equal(result.biblical_reference, 'Romanos 9:15');
    });

    it('deve classificar questionamento sobre passagem difícil como THEOLOGICAL_QUERY', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Não entendi o versículo, parece uma passagem difícil de interpretar. O que significa isso?',
        bible_ref: { book: 'Hebreus', slug: 'hb', chapter: 6, verse: 4, display: 'Hebreus 6:4' },
      });

      assert.equal(result.intent, 'THEOLOGICAL_QUERY');
      assert.ok(result.confidence >= 0.80);
    });

    it('deve classificar questionamento de fé sobre teólogos e historicidade de Jesus como THEOLOGICAL_QUERY', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Eu estive vendo videos de teologos estudiosos dizendo que Jesus nunca existiu, isso me gerou duvidas',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'THEOLOGICAL_QUERY');
      assert.ok(result.confidence >= 0.80, `Esperado >= 0.80, recebido ${result.confidence}`);
    });

    it('deve retornar a cópia exata da pílula de THEOLOGICAL_QUERY', () => {
      const copy = getPastoralPillCopy('THEOLOGICAL_QUERY', pastorName, 'Romanos 9:15');
      assert.equal(
        copy.prompt,
        `Esta passagem possui um contexto profundo! Quer enviar uma pergunta de estudo para o Pr. ${pastorName}?`
      );
      assert.equal(copy.buttonLabel, 'Tirar Dúvida com Pastor');
    });
  });

  describe('Pilar 3: THANKSGIVING (Testemunho de Vitória, Paz, Gratidão a Deus)', () => {
    it('deve classificar nota de gratidão e louvor como THANKSGIVING com confiança >= 0.80', () => {
      const result = classifyPastoralIntentLocally({
        text: 'O Senhor fez maravilhas em nossa família! Gratidão sem fim e muita alegria no coração por essa grande vitória.',
        category: 'testemunho',
      });

      assert.equal(result.intent, 'THANKSGIVING');
      assert.ok(result.confidence >= 0.80, `Esperado >= 0.80, recebido ${result.confidence}`);
    });

    it('deve classificar registro na categoria testemunho como THANKSGIVING', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Até aqui nos ajudou o Senhor. Deus é fiel e sustentou nossa casa.',
        category: 'testemunho',
      });

      assert.equal(result.intent, 'THANKSGIVING');
      assert.ok(result.confidence >= 0.80);
    });

    it('deve retornar a cópia exata da pílula de THANKSGIVING', () => {
      const copy = getPastoralPillCopy('THANKSGIVING', pastorName);
      assert.equal(
        copy.prompt,
        `Deus é fiel! Quer compartilhar essa alegria com o Pr. ${pastorName}?`
      );
      assert.equal(copy.buttonLabel, 'Enviar Ação de Graças');
    });
  });

  describe('Pilar 4: ANSWERED_PRAYER (Marcação Explícita de Oração Respondida)', () => {
    it('deve priorizar ANSWERED_PRAYER quando is_answered for true com confiança quase 1.0', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Clamei pela cura e restauração.',
        category: 'oracao',
        is_answered: true,
      });

      assert.equal(result.intent, 'ANSWERED_PRAYER');
      assert.ok(result.confidence >= 0.95, `Esperado >= 0.95, recebido ${result.confidence}`);
    });

    it('deve classificar texto contendo marcador explícito de oração respondida como ANSWERED_PRAYER', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Deus me ouviu e respondeu minha oração de forma sobrenatural!',
        category: 'oracao',
      });

      assert.equal(result.intent, 'ANSWERED_PRAYER');
      assert.ok(result.confidence >= 0.80);
    });

    it('deve retornar a cópia exata da pílula de ANSWERED_PRAYER', () => {
      const copy = getPastoralPillCopy('ANSWERED_PRAYER', pastorName);
      assert.equal(
        copy.prompt,
        `Deus respondeu sua oração! Quer notificar o Pr. ${pastorName} para celebrarem juntos?`
      );
      assert.equal(copy.buttonLabel, 'Compartilhar Testemunho');
    });
  });

  describe('Regras de Interface (Condições de Exibição do Banner)', () => {
    const validClassification: PastoralClassificationResult = {
      intent: 'CRISIS',
      confidence: 0.88,
      reason: 'Sinais agudos detectados',
      evaluated_at: new Date().toISOString(),
    };

    it('deve exibir o banner quando confidence >= 0.80 E pastor_status == "active"', () => {
      const show = shouldShowPastoralActionBanner(validClassification, 'active');
      assert.equal(show, true);
    });

    it('deve ocultar o banner quando pastor_status NÃO for "active" (ex: "pending", "revoked", null)', () => {
      assert.equal(shouldShowPastoralActionBanner(validClassification, 'pending'), false);
      assert.equal(shouldShowPastoralActionBanner(validClassification, 'revoked'), false);
      assert.equal(shouldShowPastoralActionBanner(validClassification, null), false);
      assert.equal(shouldShowPastoralActionBanner(validClassification, undefined), false);
    });

    it('deve ocultar o banner quando confidence for menor que 0.80', () => {
      const lowConfidence: PastoralClassificationResult = {
        ...validClassification,
        confidence: 0.79,
      };
      assert.equal(shouldShowPastoralActionBanner(lowConfidence, 'active'), false);
    });

    it('deve ocultar o banner se nenhum intent for detectado', () => {
      const noIntent: PastoralClassificationResult = {
        intent: null,
        confidence: 0.0,
        reason: 'Neutro',
        evaluated_at: new Date().toISOString(),
      };
      assert.equal(shouldShowPastoralActionBanner(noIntent, 'active'), false);
    });
  });

  describe('Reflexão como Ambiente Geral Acolhedor (Recebimento de Todas as Naturezas)', () => {
    it('deve classificar relato de bênção, emprego e testemunho salvo como "reflexao" como THANKSGIVING (caso real do usuário)', () => {
      const result = classifyPastoralIntentLocally({
        text: 'fui abençoado por Deus com uma oportunidade de emprego e que irei testemunhar para toda a igreja',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'THANKSGIVING');
      assert.ok(result.confidence >= 0.80, `Esperado >= 0.80, recebido ${result.confidence}`);
      assert.equal(shouldShowPastoralActionBanner(result, 'active'), true);
    });

    it('deve classificar relato de oração respondida salvo como "reflexao" como ANSWERED_PRAYER', () => {
      const result = classifyPastoralIntentLocally({
        text: 'O Senhor me ouviu e respondeu minha oração de cura na madrugada!',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'ANSWERED_PRAYER');
      assert.ok(result.confidence >= 0.80);
      assert.equal(shouldShowPastoralActionBanner(result, 'active'), true);
    });

    it('deve classificar desabafo de aflição extrema salvo como "reflexao" como CRISIS', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Sinto uma dor na alma e uma angústia profunda, cheguei no meu limite.',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'CRISIS');
      assert.ok(result.confidence >= 0.80);
    });

    it('deve classificar dúvida bíblica salva como "reflexao" como THEOLOGICAL_QUERY', () => {
      const result = classifyPastoralIntentLocally({
        text: 'Estou com dúvida sobre o que significa essa passagem bíblica.',
        category: 'reflexao',
      });

      assert.equal(result.intent, 'THEOLOGICAL_QUERY');
      assert.ok(result.confidence >= 0.80);
      assert.equal(shouldShowPastoralActionBanner(result, 'active'), true);
    });
  });
});

