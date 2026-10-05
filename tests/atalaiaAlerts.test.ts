import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PastoralAlert,
  PastoralTriggerType,
  checkPastoralAlertRateLimit,
  buildCareSignalEmailPayload,
} from '../src/lib/atalaiaTypes';

describe('Atalaia Disparo de Sinal de Cuidado com Cooldown Diferenciado (Ticket 4)', () => {
  const baseNow = new Date('2026-10-05T12:00:00.000Z');

  describe('Algoritmo de Rate Limiting e Cooldown Diferenciado (ADR 0004)', () => {
    it('deve permitir disparo se o Leitor nunca enviou nenhum alerta anterior', () => {
      const result = checkPastoralAlertRateLimit({
        previousAlerts: [],
        newTriggerType: 'care_signal',
        noteId: 'note-1',
        now: baseNow,
      });

      assert.equal(result.allowed, true);
    });

    it('deve bloquear disparo sobre o MESMO registro se enviado há menos de 7 dias (ex: 3 dias atrás)', () => {
      const pastAlert: PastoralAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'care_signal',
        note_id: 'note-1',
        sent_at: new Date(baseNow.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastAlert],
        newTriggerType: 'care_signal',
        noteId: 'note-1',
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'same_note_7d');
      assert.ok(result.remainingHours && result.remainingHours > 0);
    });

    it('deve permitir reenvio sobre o MESMO registro após transcorridos 7 dias (ex: 8 dias atrás)', () => {
      const pastAlert: PastoralAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'care_signal',
        note_id: 'note-1',
        sent_at: new Date(baseNow.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 8 * 24 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastAlert],
        newTriggerType: 'care_signal',
        noteId: 'note-1',
        now: baseNow,
      });

      assert.equal(result.allowed, true);
    });

    it('deve bloquear disparo sobre registro DISTINTO se enviado há menos de 48 horas (ex: 20 horas atrás)', () => {
      const pastAlert: PastoralAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'care_signal',
        note_id: 'note-1',
        sent_at: new Date(baseNow.getTime() - 20 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 20 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastAlert],
        newTriggerType: 'care_signal',
        noteId: 'note-2', // Registro diferente!
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'distinct_note_48h');
      assert.ok(result.remainingHours && result.remainingHours > 0);
    });

    it('deve permitir disparo sobre registro DISTINTO após transcorridas 48 horas (ex: 50 horas atrás)', () => {
      const pastAlert: PastoralAlert = {
        id: 'alert-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'care_signal',
        note_id: 'note-1',
        sent_at: new Date(baseNow.getTime() - 50 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 50 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastAlert],
        newTriggerType: 'care_signal',
        noteId: 'note-2', // Registro diferente
        now: baseNow,
      });

      assert.equal(result.allowed, true);
    });
  });

  describe('Invariante do Conteúdo do E-mail do Sinal de Cuidado (Zero Leaks)', () => {
    it('deve conter apenas requester_name, sugestões afetuosas de aproximação e zero texto do memorial', () => {
      const payload = buildCareSignalEmailPayload({
        requesterName: 'Bruno',
        contactName: 'Pastor Marcos',
        contactEmail: 'pastor.marcos@igreja.org',
      });

      assert.equal(payload.to, 'pastor.marcos@igreja.org');
      assert.match(payload.subject, /Bruno/);
      assert.match(payload.html, /Lembrei de você em oração/);
      assert.match(payload.html, /Memorial guarda/);
      assert.match(payload.html, /sem transparecer qualquer alarme/i);

      // Invariantes estritas de privacidade:
      assert.doesNotMatch(payload.html, /user_notes/);
      assert.doesNotMatch(payload.html, /note_id/);
      assert.doesNotMatch(payload.html, /score/i);
      assert.doesNotMatch(payload.html, /diagn[oó]stic/i);
    });
  });
});
