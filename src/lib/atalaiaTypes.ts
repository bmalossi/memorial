/**
 * atalaiaTypes.ts — Tipos e Contratos de Dados do Atalaia (Bíblia Vive / Memorial)
 *
 * Implementa os contratos de domínio e invariantes de segurança:
 * - ADR 0001: Telemetria Cega desvinculada de qualquer identificador de usuário.
 * - ADR 0003: Tabela dedicada pastoral_contacts isolada de profiles.
 * - ADR 0004: Auditoria técnica mínima sem persistência de reflexões/memórias.
 */

export type PastoralContactStatus = 'pending' | 'active' | 'revoked' | 'rejected';
export type PastoralContactRole = 'pastor' | 'lider' | 'outro' | string;
export type PastoralTriggerType = 'care_signal' | 'explicit_help';

export interface PastoralContact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: PastoralContactRole;
  requester_name: string;
  status: PastoralContactStatus;
  confirmation_token?: string | null;
  verified_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PastoralAlert {
  id: string;
  user_id: string;
  contact_id: string;
  trigger_type: PastoralTriggerType;
  note_id?: string | null;
  sent_at: string;
  delivery_status: 'delivered' | 'failed' | 'rate_limited' | 'pending';
  created_at: string;
}

export interface CareTelemetryEvent {
  id?: string;
  has_care_contact: boolean;
  platform: 'android' | 'ios' | 'web';
  created_at: string;
}

export interface PastoralContactInput {
  name: string;
  email: string;
  role?: string;
  requesterName: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

/**
 * Valida os dados para cadastro do Contato de Cuidado.
 * Exige expressamente o requesterName para que o pastor reconheça quem o chamou.
 */
export function validatePastoralContactInput(
  input: PastoralContactInput
): ValidationResult<Omit<PastoralContact, 'id' | 'user_id' | 'status' | 'created_at'>> {
  const trimmedName = input.name?.trim();
  const trimmedEmail = input.email?.trim().toLowerCase();
  const trimmedRequester = input.requesterName?.trim();
  const trimmedRole = input.role?.trim() || 'pastor';

  if (!trimmedName || trimmedName.length < 2) {
    return { isValid: false, error: 'O nome do contato pastoral é obrigatório.' };
  }

  // Validação básica de formato de e-mail (RFC-lite)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Informe um endereço de e-mail válido para o contato.' };
  }

  if (!trimmedRequester || trimmedRequester.length < 2) {
    return {
      isValid: false,
      error: 'Informe "Como seu contato deve te chamar" para que ele reconheça sua mensagem.',
    };
  }

  return {
    isValid: true,
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: trimmedRole,
      requester_name: trimmedRequester,
    },
  };
}

/**
 * Sanitiza o payload técnico de auditoria de alerta.
 * INVARIANTE ABSOLUTA: remove qualquer tentativa de incluir texto de memórias,
 * títulos, transcrições ou scores de IA.
 */
export function sanitizeAlertAuditPayload(input: {
  userId: string;
  contactId: string;
  triggerType: PastoralTriggerType;
  noteId?: string | null;
  [key: string]: any;
}): Omit<PastoralAlert, 'id' | 'created_at' | 'sent_at' | 'delivery_status'> {
  return {
    user_id: input.userId,
    contact_id: input.contactId,
    trigger_type: input.triggerType,
    note_id: input.noteId || null,
  };
}

/**
 * Constrói payload de telemetria agregada cega.
 * INVARIANTE ABSOLUTA (ADR 0001): sem user_id, sem email, sem hash.
 */
export function buildBlindTelemetryPayload(input: {
  hasCareContact: boolean;
  platform: 'android' | 'ios' | 'web';
}): CareTelemetryEvent {
  return {
    has_care_contact: Boolean(input.hasCareContact),
    platform: input.platform,
    created_at: new Date().toISOString(),
  };
}
