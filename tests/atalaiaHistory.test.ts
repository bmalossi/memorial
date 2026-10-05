import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PastoralAlert,
  formatAlertHistoryItem,
  checkPastoralAlertRateLimit,
} from '../src/lib/atalaiaTypes';

describe('Atalaia Pedido Explícito de Ajuda e Histórico de Sinais (Ticket 5)', () => {
  const baseNow = new Date('2026-10-05T12:00:00.000Z');

  describe('Trava de Cooldown de 24 Horas para Pedido Explícito (ADR 0004)', () => {
    it('deve bloquear clique repetido no mesmo dia (ex: 3 horas após o primeiro)', () => {
      const pastExplicit: PastoralAlert = {
        id: 'alert-exp-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'explicit_help',
        sent_at: new Date(baseNow.getTime() - 3 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 3 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastExplicit],
        newTriggerType: 'explicit_help',
        now: baseNow,
      });

      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'explicit_help_24h');
      assert.ok(result.remainingHours && result.remainingHours > 0);
    });

    it('deve liberar novo pedido de ajuda após 24 horas', () => {
      const pastExplicit: PastoralAlert = {
        id: 'alert-exp-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'explicit_help',
        sent_at: new Date(baseNow.getTime() - 25 * 3600 * 1000).toISOString(),
        delivery_status: 'delivered',
        created_at: new Date(baseNow.getTime() - 25 * 3600 * 1000).toISOString(),
      };

      const result = checkPastoralAlertRateLimit({
        previousAlerts: [pastExplicit],
        newTriggerType: 'explicit_help',
        now: baseNow,
      });

      assert.equal(result.allowed, true);
    });
  });

  describe('Formatação e Transparência do Histórico Técnico de Sinais (User Story 27)', () => {
    it('deve formatar alerta do tipo Sinal de Cuidado sem expor texto de memórias', () => {
      const alert: PastoralAlert = {
        id: 'alert-care-1',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'care_signal',
        note_id: 'note-uuid-99',
        sent_at: '2026-10-05T10:00:00.000Z',
        delivery_status: 'delivered',
        created_at: '2026-10-05T10:00:00.000Z',
      };

      const formatted = formatAlertHistoryItem(alert);

      assert.equal(formatted.typeLabel, 'Sinal de Cuidado');
      assert.equal(formatted.statusLabel, 'Entregue');
      assert.ok(formatted.formattedDate.length > 0);
      assert.equal('content' in (formatted as any), false);
      assert.equal('text' in (formatted as any), false);
    });

    it('deve formatar alerta do tipo Pedido Explícito de Ajuda', () => {
      const alert: PastoralAlert = {
        id: 'alert-exp-2',
        user_id: 'user-1',
        contact_id: 'contact-1',
        trigger_type: 'explicit_help',
        sent_at: '2026-10-04T15:30:00.000Z',
        delivery_status: 'failed',
        created_at: '2026-10-04T15:30:00.000Z',
      };

      const formatted = formatAlertHistoryItem(alert);

      assert.equal(formatted.typeLabel, 'Pedido Direto de Ajuda');
      assert.equal(formatted.statusLabel, 'Falha no Envio');
    });
  });
});
