import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PastoralContact,
  isTokenExpired,
  generateInvitationTokenData,
  processInvitationTokenDecision,
  buildInvitationEmailPayload,
  canSendPastoralAlert,
} from '../src/lib/atalaiaTypes';

describe('Atalaia Gestão de Contato e Convite Web (Ticket 2)', () => {
  const mockBaseContact: PastoralContact = {
    id: 'contact-uuid-1',
    user_id: 'user-uuid-1',
    name: 'Pastor Jonas',
    email: 'pastor.jonas@igreja.org',
    role: 'pastor',
    requester_name: 'Bruno',
    status: 'pending',
    confirmation_token: 'valid-crypto-token-12345',
    token_expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  describe('Geração de Token e Janela de Expiração de 48 Horas (ADR 0002)', () => {
    it('deve gerar token seguro com expiração calculada para exatamente 48 horas no futuro', () => {
      const now = new Date('2026-10-05T12:00:00.000Z');
      const tokenData = generateInvitationTokenData(now);

      assert.ok(tokenData.token.length >= 32, 'Token deve ter ao menos 32 caracteres');
      const expiresAt = new Date(tokenData.expiresAt);
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      assert.equal(diffHours, 48, 'Expiração deve ser de exatamente 48 horas');
    });

    it('deve identificar tokens expirados após 48 horas', () => {
      const now = new Date('2026-10-07T12:01:00.000Z');
      const tokenExpiresAt = '2026-10-07T12:00:00.000Z'; // 1 minuto atrás

      assert.equal(isTokenExpired(tokenExpiresAt, now), true);
    });

    it('deve aceitar tokens dentro da janela de 48 horas', () => {
      const now = new Date('2026-10-07T11:00:00.000Z');
      const tokenExpiresAt = '2026-10-07T12:00:00.000Z'; // 1 hora restante

      assert.equal(isTokenExpired(tokenExpiresAt, now), false);
    });
  });

  describe('Validação e Transição de Estado do Convite Web', () => {
    it('deve rejeitar token quando o contato não está em estado pending', () => {
      const activeContact: PastoralContact = {
        ...mockBaseContact,
        status: 'active',
      };

      const result = processInvitationTokenDecision({
        contact: activeContact,
        token: 'valid-crypto-token-12345',
        action: 'accept',
      });

      assert.equal(result.success, false);
      assert.match(result.error || '', /pendente/i);
    });

    it('deve rejeitar token que expirou', () => {
      const expiredContact: PastoralContact = {
        ...mockBaseContact,
        token_expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      };

      const result = processInvitationTokenDecision({
        contact: expiredContact,
        token: 'valid-crypto-token-12345',
        action: 'accept',
      });

      assert.equal(result.success, false);
      assert.match(result.error || '', /expir/i);
    });

    it('deve rejeitar token com valor incorreto', () => {
      const result = processInvitationTokenDecision({
        contact: mockBaseContact,
        token: 'token-errado',
        action: 'accept',
      });

      assert.equal(result.success, false);
      assert.match(result.error || '', /inválido/i);
    });

    it('deve transicionar status para active e registrar verified_at quando pastor aceitar', () => {
      const now = new Date('2026-10-05T14:00:00.000Z');
      const result = processInvitationTokenDecision({
        contact: mockBaseContact,
        token: 'valid-crypto-token-12345',
        action: 'accept',
        now,
      });

      assert.equal(result.success, true);
      assert.equal(result.updatedContact?.status, 'active');
      assert.equal(result.updatedContact?.verified_at, now.toISOString());
      assert.equal(result.updatedContact?.confirmation_token, null);
    });

    it('deve transicionar status para rejected quando pastor declinar com carinho', () => {
      const now = new Date('2026-10-05T14:00:00.000Z');
      const result = processInvitationTokenDecision({
        contact: mockBaseContact,
        token: 'valid-crypto-token-12345',
        action: 'decline',
        now,
      });

      assert.equal(result.success, true);
      assert.equal(result.updatedContact?.status, 'rejected');
      assert.equal(result.updatedContact?.confirmation_token, null);
    });
  });

  describe('Regras de Revogação e Autorização de Disparos', () => {
    it('deve autorizar disparo de alerta SOMENTE se o contato estiver ativo', () => {
      const activeContact: PastoralContact = { ...mockBaseContact, status: 'active' };
      const pendingContact: PastoralContact = { ...mockBaseContact, status: 'pending' };
      const revokedContact: PastoralContact = { ...mockBaseContact, status: 'revoked' };
      const rejectedContact: PastoralContact = { ...mockBaseContact, status: 'rejected' };

      assert.equal(canSendPastoralAlert(activeContact), true);
      assert.equal(canSendPastoralAlert(pendingContact), false);
      assert.equal(canSendPastoralAlert(revokedContact), false);
      assert.equal(canSendPastoralAlert(rejectedContact), false);
      assert.equal(canSendPastoralAlert(null), false);
    });
  });

  describe('Invariante do Conteúdo do E-mail de Convite (Zero Leaks)', () => {
    it('deve construir payload com requester_name, link seguro e sem dados privados', () => {
      const payload = buildInvitationEmailPayload({
        requesterName: 'Bruno',
        contactName: 'Pastor Jonas',
        contactEmail: 'pastor.jonas@igreja.org',
        token: 'token-abc-123',
        webBaseUrl: 'https://bibliavive.com.br',
      });

      assert.equal(payload.to, 'pastor.jonas@igreja.org');
      assert.match(payload.subject, /Bruno/);
      assert.match(payload.html, /https:\/\/bibliavive\.com\.br\/atalaia\/confirmar\?token=token-abc-123/);
      assert.match(payload.html, /Memorial guarda/);
      assert.match(payload.html, /Atalaia cuida/);
      assert.match(payload.html, /nunca terá acesso às anotações/i);

      // Invariante de Segurança: Zero vazamento de texto do memorial ou ids
      assert.doesNotMatch(payload.html, /user_notes/);
      assert.doesNotMatch(payload.html, /note_id/);
      assert.doesNotMatch(payload.html, /score/i);
    });
  });
});
