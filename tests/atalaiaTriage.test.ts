import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldEvaluateForCareTriage,
  shouldShowCareBanner,
  validateTriageResponse,
} from '../src/lib/atalaiaTypes';

describe('Atalaia Triagem de Cuidado e Acolhimento Pessoal (Ticket 3)', () => {
  const baseNow = new Date('2026-10-05T12:00:00.000Z');

  describe('Filtro de Sincronização Offline (Janela de 48h - User Story 26)', () => {
    it('deve permitir triagem para registros criados recentemente (ex: 2h atrás)', () => {
      const recent = new Date(baseNow.getTime() - 2 * 3600 * 1000).toISOString();
      assert.equal(shouldEvaluateForCareTriage(recent, baseNow), true);
    });

    it('deve permitir triagem para registros criados há 47 horas', () => {
      const withinLimit = new Date(baseNow.getTime() - 47 * 3600 * 1000).toISOString();
      assert.equal(shouldEvaluateForCareTriage(withinLimit, baseNow), true);
    });

    it('deve bloquear triagem retroativa para registros criados há mais de 48 horas', () => {
      const oldDraft = new Date(baseNow.getTime() - 49 * 3600 * 1000).toISOString();
      assert.equal(shouldEvaluateForCareTriage(oldDraft, baseNow), false);
    });

    it('deve bloquear triagem retroativa para rascunhos de semanas atrás sincronizados agora', () => {
      const veryOldDraft = new Date(baseNow.getTime() - 14 * 24 * 3600 * 1000).toISOString();
      assert.equal(shouldEvaluateForCareTriage(veryOldDraft, baseNow), false);
    });
  });

  describe('Controle de Cooldown Local do Banner In-App (Anti-Fadiga)', () => {
    it('deve exibir banner se nunca foi dispensado anteriormente', () => {
      assert.equal(shouldShowCareBanner(null, baseNow), true);
      assert.equal(shouldShowCareBanner(undefined, baseNow), true);
    });

    it('deve respeitar cooldown de 24 horas se dispensado recentemente (ex: 4h atrás)', () => {
      const recentDismiss = new Date(baseNow.getTime() - 4 * 3600 * 1000).toISOString();
      assert.equal(shouldShowCareBanner(recentDismiss, baseNow), false);
    });

    it('deve voltar a permitir exibição após 24 horas da última dispensa', () => {
      const oldDismiss = new Date(baseNow.getTime() - 25 * 3600 * 1000).toISOString();
      assert.equal(shouldShowCareBanner(oldDismiss, baseNow), true);
    });
  });

  describe('Contrato Efêmero da Resposta de Triagem (Zero Diagnósticos)', () => {
    it('deve validar resposta estritamente booleana da Edge Function', () => {
      const validPositive = { eligible_for_care_prompt: true };
      const validNegative = { eligible_for_care_prompt: false };

      assert.equal(validateTriageResponse(validPositive).isValid, true);
      assert.equal(validateTriageResponse(validPositive).eligible, true);

      assert.equal(validateTriageResponse(validNegative).isValid, true);
      assert.equal(validateTriageResponse(validNegative).eligible, false);
    });

    it('deve rejeitar e expurgar payloads com campos clínicos, diagnósticos ou texto espelhado', () => {
      const contaminatedPayload = {
        eligible_for_care_prompt: true,
        clinical_score: 9.5,
        diagnosis: 'Depressão maior',
        user_reflection_snippet: 'Estou sofrendo muito',
      };

      const result = validateTriageResponse(contaminatedPayload);
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /invariante de privacidade violada/i);
    });
  });
});
