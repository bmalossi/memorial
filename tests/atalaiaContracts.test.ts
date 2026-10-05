import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  PastoralContact,
  PastoralAlert,
  CareTelemetryEvent,
} from '../src/lib/atalaiaTypes';
import {
  validatePastoralContactInput,
  sanitizeAlertAuditPayload,
  buildBlindTelemetryPayload,
} from '../src/lib/atalaiaTypes';

describe('Atalaia Data Contracts & Invariants (Ticket 1)', () => {
  describe('Invariante de Telemetria Cega (ADR 0001)', () => {
    it('deve garantir que o payload de telemetria cega nunca inclua user_id, email ou hash', () => {
      const telemetry = buildBlindTelemetryPayload({
        hasCareContact: false,
        platform: 'android',
      });

      assert.equal(telemetry.has_care_contact, false);
      assert.equal(telemetry.platform, 'android');
      assert.ok(telemetry.created_at, 'deve ter timestamp');

      // Invariantes estritas de privacidade
      assert.equal((telemetry as any).user_id, undefined, 'telemetria jamais pode ter user_id');
      assert.equal((telemetry as any).email, undefined, 'telemetria jamais pode ter email');
      assert.equal((telemetry as any).hash, undefined, 'telemetria jamais pode ter hash');
    });
  });

  describe('Invariante de Auditoria de Alertas sem Memórias (ADR 0004 & Seção 8)', () => {
    it('deve sanitizar o alerta para conter apenas metadados técnicos sem texto de reflexão', () => {
      const rawInput = {
        userId: 'user-uuid-123',
        contactId: 'contact-uuid-456',
        triggerType: 'care_signal' as const,
        noteId: 'note-uuid-789',
        content: 'Texto sensível da oração em lágrimas...', // Tentativa indevida de passar texto
        title: 'Título da angústia',
      };

      const sanitized = sanitizeAlertAuditPayload(rawInput);

      assert.equal(sanitized.user_id, 'user-uuid-123');
      assert.equal(sanitized.contact_id, 'contact-uuid-456');
      assert.equal(sanitized.trigger_type, 'care_signal');
      assert.equal(sanitized.note_id, 'note-uuid-789');

      // Invariantes estritas de privacidade
      assert.equal((sanitized as any).content, undefined, 'alerta jamais pode persistir texto');
      assert.equal((sanitized as any).title, undefined, 'alerta jamais pode persistir título');
      assert.equal((sanitized as any).score, undefined, 'alerta jamais pode persistir score');
    });
  });

  describe('Validação de Entrada de Contato de Cuidado (Decisão 11 & ADR 0003)', () => {
    it('deve exigir o campo requester_name ("Como seu contato deve te chamar")', () => {
      const resultSemNome = validatePastoralContactInput({
        name: 'Pastor Silas',
        email: 'pastor@igreja.com',
        role: 'pastor',
        requesterName: '', // Vazio
      });

      assert.equal(resultSemNome.isValid, false);
      assert.ok(resultSemNome.error?.includes('Como seu contato deve te chamar'));

      const resultValido = validatePastoralContactInput({
        name: 'Pastor Silas',
        email: 'pastor@igreja.com',
        role: 'pastor',
        requesterName: 'Bruno',
      });

      assert.equal(resultValido.isValid, true);
      assert.equal(resultValido.data?.requester_name, 'Bruno');
    });

    it('deve validar formato básico de e-mail do contato', () => {
      const resultEmailInvalido = validatePastoralContactInput({
        name: 'Pastor Silas',
        email: 'email-invalido',
        role: 'pastor',
        requesterName: 'Bruno',
      });

      assert.equal(resultEmailInvalido.isValid, false);
      assert.ok(resultEmailInvalido.error?.toLowerCase().includes('e-mail'));
    });
  });
});
