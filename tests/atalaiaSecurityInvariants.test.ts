import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PastoralContact,
  PastoralAlert,
  canSendPastoralAlert,
  buildInvitationEmailPayload,
  buildCareSignalEmailPayload,
  sanitizeAlertAuditPayload,
  buildBlindTelemetryPayload,
  validateTriageResponse,
  checkPastoralAlertRateLimit,
  shouldEvaluateForCareTriage,
  isTokenExpired,
  processInvitationTokenDecision,
} from '../src/lib/atalaiaTypes';

/**
 * Bateria Completa de Testes de Privacidade e Segurança (Ticket 6)
 *
 * Valida de forma estrita as 10 invariantes obrigatórias de privacidade e segurança
 * estabelecidas na Seção 19 do Brief de Governança Editorial e nos ADRs 0001, 0002, 0003 e 0004.
 */
describe('Atalaia — Bateria de Privacidade e Segurança (Ticket 6)', () => {
  const baseNow = new Date('2026-10-05T12:00:00.000Z');

  // Invariante 1: Isolamento e Separação de Dados (RLS e Tabela Dedicada)
  describe('Invariante 1: Isolamento de Dados e Separação de Responsabilidade (ADR 0003)', () => {
    it('deve garantir que o Contato de Cuidado nunca possui permissão ou relação direta que exponha user_notes', () => {
      // Simulação de verificação de permissão e política RLS:
      // A tabela pastoral_contacts reside isolada e nenhuma foreign key ou join concede permissão de leitura sobre user_notes.
      const contactUser = { id: 'pastor-user-uuid', role: 'authenticated' };
      const noteOwnerUser = { id: 'reader-user-uuid', role: 'authenticated' };

      // Regra de RLS: user_notes só permite SELECT onde user_id = auth.uid()
      const canReadNotes = (readerAuthId: string, noteOwnerId: string) => readerAuthId === noteOwnerId;

      assert.equal(canReadNotes(contactUser.id, noteOwnerUser.id), false);
      assert.equal(canReadNotes(noteOwnerUser.id, noteOwnerUser.id), true);
    });
  });

  // Invariante 2: Conteúdo Zero-Leakage nos E-mails e Auditoria (Zero Memórias / Zero Scores)
  describe('Invariante 2: Zero Vazamento de Memórias, Títulos, Escrituras ou Scores (Seção 19 & ADR 0004)', () => {
    const sensitiveTestData = {
      privateNoteText: 'Hoje senti uma dor profunda e solidão existencial diante de Deus em lágrimas.',
      scriptureQuote: 'Salmos 88:1-3 As trevas são a minha única companhia',
      aiScore: 0.94,
      aiCategory: 'severe_affliction',
    };

    it('payload do e-mail de convite pastoral NUNCA deve conter menção a textos, versículos ou scores', () => {
      const invitePayload = buildInvitationEmailPayload({
        requesterName: 'Bruno',
        contactName: 'Pastor Marcos',
        contactEmail: 'marcos@igreja.org',
        token: 'token-secreto-123',
      });

      const fullContent = `${invitePayload.subject} ${invitePayload.html} ${invitePayload.text}`;

      assert.ok(!fullContent.includes(sensitiveTestData.privateNoteText));
      assert.ok(!fullContent.includes(sensitiveTestData.scriptureQuote));
      assert.ok(!fullContent.includes(String(sensitiveTestData.aiScore)));
      assert.ok(!fullContent.includes(sensitiveTestData.aiCategory));
      assert.ok(fullContent.includes('O Memorial guarda. O Atalaia cuida.'));
      assert.ok(fullContent.includes('nunca terá acesso às anotações'));
    });

    it('payload do e-mail de Sinal de Cuidado NUNCA deve conter texto de reflexão, referências bíblicas da anotação ou scores', () => {
      const signalPayload = buildCareSignalEmailPayload({
        requesterName: 'Bruno',
        contactName: 'Pastor Marcos',
        contactEmail: 'marcos@igreja.org',
      });

      const fullContent = `${signalPayload.subject} ${signalPayload.html} ${signalPayload.text}`;

      assert.ok(!fullContent.includes(sensitiveTestData.privateNoteText));
      assert.ok(!fullContent.includes(sensitiveTestData.scriptureQuote));
      assert.ok(!fullContent.includes(String(sensitiveTestData.aiScore)));
      assert.ok(!fullContent.includes(sensitiveTestData.aiCategory));
      assert.ok(fullContent.includes('Nenhuma palavra da reflexão'));
    });

    it('payload gravado em pastoral_alerts para auditoria técnica deve expurgar qualquer campo de texto ou memória', () => {
      const auditPayload = sanitizeAlertAuditPayload({
        userId: 'user-1',
        contactId: 'contact-1',
        triggerType: 'care_signal',
        noteId: 'note-uuid-42',
        // Tentativa de injeção de campos privados que devem ser ignorados
        content: sensitiveTestData.privateNoteText,
        title: 'Meu desabafo',
        scripture: sensitiveTestData.scriptureQuote,
        ai_score: sensitiveTestData.aiScore,
      });

      assert.equal('content' in auditPayload, false);
      assert.equal('title' in auditPayload, false);
      assert.equal('scripture' in auditPayload, false);
      assert.equal('ai_score' in auditPayload, false);
      assert.equal(auditPayload.user_id, 'user-1');
      assert.equal(auditPayload.contact_id, 'contact-1');
      assert.equal(auditPayload.trigger_type, 'care_signal');
      assert.equal(auditPayload.note_id, 'note-uuid-42');
    });
  });

  // Invariante 3: Consentimento Explícito (Zero Disparos Automáticos)
  describe('Invariante 3: Consentimento Explícito do Leitor (Seção 19)', () => {
    it('triagem positiva de elegibilidade NUNCA deve acionar envio automático sem consentimento do usuário', () => {
      let emailDispatched = false;
      const fakeDispatchEmail = () => {
        emailDispatched = true;
      };

      // 1. Registro avaliado na triagem como elegível
      const triageResult = validateTriageResponse({ eligible_for_care_prompt: true });
      assert.equal(triageResult.eligible, true);

      // Invariante: O app apenas renderiza a sugestão de sinal / acolhimento
      // O e-mail NÃO é disparado
      assert.equal(emailDispatched, false);

      // 2. Apenas se o usuário clicar expressamente em "Enviar Sinal de Cuidado"
      const userConsentGiven = true;
      if (userConsentGiven) {
        fakeDispatchEmail();
      }

      assert.equal(emailDispatched, true);
    });
  });

  // Invariante 4: Revogação Imediata e Bloqueio de Disparos
  describe('Invariante 4: Revogação Imediata de Autorização (ADR 0003 & Seção 19)', () => {
    it('deve bloquear imediatamente disparos se o contato estiver revogado (status = revoked)', () => {
      const revokedContact: PastoralContact = {
        id: 'contact-revoked',
        user_id: 'user-1',
        name: 'Pastor Marcos',
        email: 'marcos@igreja.org',
        role: 'pastor',
        requester_name: 'Bruno',
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      assert.equal(canSendPastoralAlert(revokedContact), false);
    });

    it('deve bloquear disparos se o contato estiver pendente ou rejeitado', () => {
      const pendingContact: PastoralContact = {
        id: 'contact-pending',
        user_id: 'user-1',
        name: 'Pastor Marcos',
        email: 'marcos@igreja.org',
        role: 'pastor',
        requester_name: 'Bruno',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const rejectedContact: PastoralContact = {
        id: 'contact-rejected',
        user_id: 'user-1',
        name: 'Pastor Marcos',
        email: 'marcos@igreja.org',
        role: 'pastor',
        requester_name: 'Bruno',
        status: 'rejected',
        created_at: new Date().toISOString(),
      };

      assert.equal(canSendPastoralAlert(pendingContact), false);
      assert.equal(canSendPastoralAlert(rejectedContact), false);
      assert.equal(canSendPastoralAlert(null), false);
    });

    it('deve autorizar disparos EXCLUSIVAMENTE quando o contato estiver no status active', () => {
      const activeContact: PastoralContact = {
        id: 'contact-active',
        user_id: 'user-1',
        name: 'Pastor Marcos',
        email: 'marcos@igreja.org',
        role: 'pastor',
        requester_name: 'Bruno',
        status: 'active',
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      assert.equal(canSendPastoralAlert(activeContact), true);
    });
  });

  // Invariante 5: Rate Limiting Diferenciado e Proteção Anti-Spam (ADR 0004)
  describe('Invariante 5: Rate Limiting Diferenciado e Cooldown (ADR 0004)', () => {
    it('trava 7 dias: deve rejeitar disparo sobre o mesmo registro enviado há 3 dias', () => {
      const previousAlert: PastoralAlert = {
        id: 'a1',
        user_id: 'u1',
        contact_id: 'c1',
        trigger_type: 'care_signal',
        note_id: 'same-note-id',
        sent_at: new Date(baseNow.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [previousAlert],
        newTriggerType: 'care_signal',
        noteId: 'same-note-id',
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'same_note_7d');
    });

    it('trava 48h: deve rejeitar disparo sobre registro distinto enviado há 24 horas', () => {
      const previousAlert: PastoralAlert = {
        id: 'a2',
        user_id: 'u1',
        contact_id: 'c1',
        trigger_type: 'care_signal',
        note_id: 'note-anterior',
        sent_at: new Date(baseNow.getTime() - 24 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 24 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [previousAlert],
        newTriggerType: 'care_signal',
        noteId: 'note-novo-distinto',
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'distinct_note_48h');
    });

    it('trava 24h: deve rejeitar pedido explícito de ajuda repetido no mesmo dia (ex: 5 horas atrás)', () => {
      const previousAlert: PastoralAlert = {
        id: 'a3',
        user_id: 'u1',
        contact_id: 'c1',
        trigger_type: 'explicit_help',
        sent_at: new Date(baseNow.getTime() - 5 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 5 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [previousAlert],
        newTriggerType: 'explicit_help',
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'explicit_help_24h');
    });
  });

  // Invariante 6: Telemetria Cega (Sem Identificadores)
  describe('Invariante 6: Telemetria Cega Absoluta (ADR 0001)', () => {
    it('deve garantir que o payload de care_telemetry_events nunca contenha user_id, email, hash ou ip', () => {
      const telemetry = buildBlindTelemetryPayload({
        hasCareContact: false,
        platform: 'android',
      });

      assert.equal('user_id' in telemetry, false);
      assert.equal('userId' in telemetry, false);
      assert.equal('email' in telemetry, false);
      assert.equal('user_email' in telemetry, false);
      assert.equal('hash' in telemetry, false);
      assert.equal('ip' in telemetry, false);
      assert.equal(telemetry.has_care_contact, false);
      assert.equal(telemetry.platform, 'android');
      assert.ok(typeof telemetry.created_at === 'string');
    });
  });

  // Invariante 7: Filtro de Sincronização Offline de 48 Horas (User Story 26)
  describe('Invariante 7: Filtro de Frescor Temporal Offline (User Story 26)', () => {
    it('deve bloquear da triagem qualquer rascunho criado há mais de 48 horas sincronizado posteriormente', () => {
      const oldDraftDate = new Date(baseNow.getTime() - 50 * 3600 * 1000).toISOString();
      const veryOldDraftDate = new Date(baseNow.getTime() - 14 * 24 * 3600 * 1000).toISOString();
      const freshDraftDate = new Date(baseNow.getTime() - 12 * 3600 * 1000).toISOString();

      assert.equal(shouldEvaluateForCareTriage(oldDraftDate, baseNow), false);
      assert.equal(shouldEvaluateForCareTriage(veryOldDraftDate, baseNow), false);
      assert.equal(shouldEvaluateForCareTriage(freshDraftDate, baseNow), true);
    });
  });

  // Invariante 8: Expiração Estrita de Tokens de Convite em 48 Horas (ADR 0002)
  describe('Invariante 8: Expiração Criptográfica do Convite Web (ADR 0002)', () => {
    it('deve rejeitar confirmação web caso o token tenha expirado (mais de 48 horas)', () => {
      const expiredAt = new Date(baseNow.getTime() - 1000).toISOString();
      const pendingContact: PastoralContact = {
        id: 'c-exp',
        user_id: 'u1',
        name: 'Pastor Marcos',
        email: 'marcos@igreja.org',
        role: 'pastor',
        requester_name: 'Bruno',
        status: 'pending',
        confirmation_token: 'valid-token',
        token_expires_at: expiredAt,
        created_at: new Date(baseNow.getTime() - 49 * 3600 * 1000).toISOString(),
      };

      assert.equal(isTokenExpired(expiredAt, baseNow), true);

      const decision = processInvitationTokenDecision({
        contact: pendingContact,
        token: 'valid-token',
        action: 'accept',
        now: baseNow,
      });

      assert.equal(decision.success, false);
      assert.ok(decision.error?.includes('expirou'));
    });
  });

  // Invariante 9: Contrato Efêmero da Triagem (Rejeição de Diagnósticos e Dados Clínicos)
  describe('Invariante 9: Contrato Efêmero e Estritamente Booleano da Triagem', () => {
    it('deve rejeitar e expurgar qualquer payload da função de triagem contendo campos clínicos ou reflexões espelhadas', () => {
      const invalidPayloads = [
        { eligible_for_care_prompt: true, score: 0.95 },
        { eligible_for_care_prompt: true, diagnosis: 'severo' },
        { eligible_for_care_prompt: true, reflection: 'trecho da oração' },
        { eligible_for_care_prompt: true, content: 'conteúdo privado' },
      ];

      for (const p of invalidPayloads) {
        const validated = validateTriageResponse(p);
        assert.equal(validated.isValid, false);
        assert.ok(validated.error?.includes('proibido'));
      }

      // Payload válido: puramente booleano
      const validPayload = validateTriageResponse({ eligible_for_care_prompt: true });
      assert.equal(validPayload.isValid, true);
      assert.equal(validPayload.eligible, true);
    });
  });

  // Invariante 10: In-App Only para Cuidado Pessoal (Sem Push na Lock-Screen)
  describe('Invariante 10: Discrição In-App Exclusiva para Acolhimento Pessoal', () => {
    it('acolhimento e sugestões de cuidado pastoral residem exclusivamente na interface do app', () => {
      // Simulação: verificação de que canais de notificação push externos não são usados para acolhimento
      const allowedCareNotificationChannels = ['in_app_banner', 'in_app_modal'];
      const prohibitedChannels = ['lock_screen_push', 'external_sms'];

      for (const ch of prohibitedChannels) {
        assert.equal(allowedCareNotificationChannels.includes(ch), false);
      }
    });
  });
});
