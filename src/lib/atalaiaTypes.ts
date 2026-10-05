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
  token_expires_at?: string | null;
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

/**
 * Gera token seguro para convite pastoral e define a expiração para 48 horas (ADR 0002).
 */
export function generateInvitationTokenData(baseDate?: Date): { token: string; expiresAt: string } {
  const now = baseDate || new Date();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  // Gera token com garantia de entropia (32+ chars)
  let randomHex = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    randomHex = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  } else {
    randomHex = Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2);
  }

  return {
    token: randomHex.substring(0, 48),
    expiresAt,
  };
}

/**
 * Avalia se o token de convite pastoral já expirou.
 */
export function isTokenExpired(tokenExpiresAt: string | null | undefined, now?: Date): boolean {
  if (!tokenExpiresAt) return true;
  const expirationTime = new Date(tokenExpiresAt).getTime();
  const currentTime = (now || new Date()).getTime();
  return currentTime > expirationTime;
}

/**
 * Transiciona o estado do convite com base na decisão do pastor via web.
 */
export function processInvitationTokenDecision(params: {
  contact: PastoralContact;
  token: string;
  action: 'accept' | 'decline';
  now?: Date;
}): { success: boolean; updatedContact?: PastoralContact; error?: string } {
  const { contact, token, action, now = new Date() } = params;

  if (contact.status !== 'pending') {
    return { success: false, error: 'O convite não está mais pendente.' };
  }

  if (isTokenExpired(contact.token_expires_at, now)) {
    return { success: false, error: 'Este convite expirou (token expirado, validade máxima de 48 horas).' };
  }

  if (!contact.confirmation_token || contact.confirmation_token !== token) {
    return { success: false, error: 'Token de confirmação inválido ou já utilizado.' };
  }

  if (action === 'accept') {
    return {
      success: true,
      updatedContact: {
        ...contact,
        status: 'active',
        verified_at: now.toISOString(),
        confirmation_token: null,
        updated_at: now.toISOString(),
      },
    };
  } else {
    return {
      success: true,
      updatedContact: {
        ...contact,
        status: 'rejected',
        confirmation_token: null,
        updated_at: now.toISOString(),
      },
    };
  }
}

/**
 * Invariante de Segurança: Alertas só podem ser emitidos para contatos com status 'active'.
 */
export function canSendPastoralAlert(contact: PastoralContact | null | undefined): boolean {
  if (!contact) return false;
  return contact.status === 'active';
}

/**
 * Constrói payload seguro para disparo de convite via Resend.
 * INVARIANTE: Zero vazamento de notas, scores, ou memórias íntimas.
 */
export function buildInvitationEmailPayload(params: {
  requesterName: string;
  contactName: string;
  contactEmail: string;
  token: string;
  webBaseUrl?: string;
}): { to: string; subject: string; html: string; text: string } {
  const baseUrl = (params.webBaseUrl || 'https://bibliavive.com.br').replace(/\/$/, '');
  const confirmUrl = `${baseUrl}/atalaia/confirmar?token=${encodeURIComponent(params.token)}`;

  const subject = `[Bíblia Vive] ${params.requesterName} indicou você como Contato de Cuidado`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Convite de Cuidado Pastoral — Atalaia</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · ATALAIA
    </div>
    <h1 style="font-size: 22px; font-weight: 600; color: #F7F5F0; margin: 0 0 20px 0; line-height: 1.4;">
      Convite de Cuidado Pastoral
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${params.contactName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      <strong>${params.requesterName}</strong> indicou você como pessoa de confiança e porto seguro de oração no aplicativo Memorial.
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 22px 24px; margin: 28px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Pacto de Confidencialidade
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 15px; color: #F5F2EB; margin-bottom: 10px;">
        "O Memorial guarda. O Atalaia cuida."
      </div>
      <div style="width: 28px; height: 1px; background-color: #383446; margin: 0 auto 12px auto;"></div>
      <p style="font-size: 13px; line-height: 1.6; color: #9E988D; margin: 0; text-align: left;">
        O Memorial é o espaço secreto onde o leitor registra orações e reflexões diante de Deus.
        Você <strong>nunca terá acesso às anotações</strong> ou ao conteúdo de suas memórias.
        Seu papel é exclusivamente espiritual: estar presente em oração e enviar uma palavra de carinho caso ele precise de amparo.
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 28px 0;">
      Para confirmar ou declinar sua disponibilidade neste papel pastoral, clique no botão abaixo diretamente em seu navegador (não é necessário baixar o aplicativo):
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmUrl}" style="background-color: #E7B075; color: #121116; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block;">
        Responder ao Convite de Cuidado
      </a>
    </div>

    <p style="font-size: 12px; color: #726E7E; text-align: center; margin: 24px 0 0 0;">
      Este link é seguro e válido por 48 horas.<br/>
      Se você não conhece quem enviou ou não puder atender no momento, você pode declinar respeitosamente na página.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
BÍBLIA VIVE · ATALAIA
Convite de Cuidado Pastoral

Olá, ${params.contactName}.

${params.requesterName} indicou você como Contato de Cuidado pastoral no Memorial.

"O Memorial guarda. O Atalaia cuida."
O Memorial é o espaço íntimo do leitor. Você nunca terá acesso às anotações ou orações escritas por ele. Seu papel é ser um porto seguro de oração.

Acesse o link abaixo em seu navegador para responder ao convite (válido por 48h):
${confirmUrl}
  `.trim();

  return {
    to: params.contactEmail,
    subject,
    html,
    text,
  };
}

/**
 * Filtro de Sincronização Offline (User Story 26):
 * Apenas registros criados nas últimas 48 horas são elegíveis para triagem de cuidado.
 * Rascunhos antigos sincronizados posteriormente são excluídos da avaliação retroativa.
 */
export function shouldEvaluateForCareTriage(createdAt: string | Date, now?: Date): boolean {
  const createdTime = new Date(createdAt).getTime();
  const currentTime = (now || new Date()).getTime();
  const diffMs = currentTime - createdTime;
  const max48hMs = 48 * 60 * 60 * 1000;

  return diffMs >= 0 && diffMs <= max48hMs;
}

/**
 * Controle de Cooldown Local do Banner In-App (Anti-Fadiga):
 * Garante intervalo de ao menos 24 horas entre dispensas do banner de amparo no dispositivo.
 */
export function shouldShowCareBanner(
  lastDismissedAt: string | null | undefined,
  now?: Date
): boolean {
  if (!lastDismissedAt) return true;

  const dismissedTime = new Date(lastDismissedAt).getTime();
  const currentTime = (now || new Date()).getTime();
  const diffMs = currentTime - dismissedTime;
  const cooldown24hMs = 24 * 60 * 60 * 1000;

  return diffMs >= cooldown24hMs;
}

/**
 * Valida o contrato efêmero da resposta de triagem retornada pela Edge Function.
 * INVARIANTE: Rejeita qualquer payload que contenha scores clínicos, diagnósticos ou texto espelhado.
 */
export function validateTriageResponse(res: any): {
  isValid: boolean;
  eligible: boolean;
  error?: string;
} {
  if (!res || typeof res !== 'object') {
    return { isValid: false, eligible: false, error: 'Resposta de triagem inválida ou ausente.' };
  }

  // Invariante de Privacidade: Detectar e rejeitar campos impróprios
  const prohibitedKeys = [
    'clinical_score',
    'score',
    'diagnosis',
    'diagnostic',
    'user_reflection_snippet',
    'reflection',
    'content',
    'text',
    'memory',
  ];

  for (const key of prohibitedKeys) {
    if (key in res) {
      return {
        isValid: false,
        eligible: false,
        error: `Invariante de privacidade violada: payload contém campo proibido '${key}'.`,
      };
    }
  }

  if (typeof res.eligible_for_care_prompt !== 'boolean') {
    return {
      isValid: false,
      eligible: false,
      error: 'Formato inválido: campo eligible_for_care_prompt deve ser booleano.',
    };
  }

  return {
    isValid: true,
    eligible: res.eligible_for_care_prompt,
  };
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'same_note_7d' | 'distinct_note_48h' | 'explicit_help_24h';
  remainingHours?: number;
  message?: string;
}

/**
 * Algoritmo de Rate Limiting e Cooldown Diferenciado (ADR 0004):
 * - Mesmo registro (same note_id): 7 dias (168 horas).
 * - Novo registro (distinct note_id): 48 horas.
 * - Pedido Explícito de Ajuda (explicit_help): 24 horas.
 */
export function checkPastoralAlertRateLimit(params: {
  previousAlerts: PastoralAlert[];
  newTriggerType: PastoralTriggerType;
  noteId?: string | null;
  now?: Date;
}): RateLimitResult {
  const nowMs = (params.now || new Date()).getTime();
  const { previousAlerts, newTriggerType, noteId } = params;

  const sortedAlerts = [...previousAlerts].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  // 1. Pedido Explícito de Ajuda: Trava de 24 horas
  if (newTriggerType === 'explicit_help') {
    const lastExplicit = sortedAlerts.find((a) => a.trigger_type === 'explicit_help');
    if (lastExplicit) {
      const diffMs = nowMs - new Date(lastExplicit.sent_at).getTime();
      const limit24hMs = 24 * 60 * 60 * 1000;
      if (diffMs < limit24hMs) {
        const remainingHours = Math.ceil((limit24hMs - diffMs) / (1000 * 60 * 60));
        return {
          allowed: false,
          reason: 'explicit_help_24h',
          remainingHours,
          message:
            'Você já enviou um pedido de ajuda hoje. Seu contato foi avisado e entrará em contato assim que possível.',
        };
      }
    }
  }

  // 2. Sinal de Cuidado derivado de Marco de Fé
  if (newTriggerType === 'care_signal') {
    // A. Mesmo registro: trava de 7 dias
    if (noteId) {
      const sameNoteAlert = sortedAlerts.find(
        (a) => a.trigger_type === 'care_signal' && a.note_id === noteId
      );
      if (sameNoteAlert) {
        const diffMs = nowMs - new Date(sameNoteAlert.sent_at).getTime();
        const limit7dMs = 7 * 24 * 60 * 60 * 1000;
        if (diffMs < limit7dMs) {
          const remainingHours = Math.ceil((limit7dMs - diffMs) / (1000 * 60 * 60));
          return {
            allowed: false,
            reason: 'same_note_7d',
            remainingHours,
            message:
              'Um sinal de cuidado sobre este mesmo registro já foi enviado recentemente (cooldown pastoral de 7 dias).',
          };
        }
      }
    }

    // B. Registro distinto: trava de 48 horas
    const lastCareSignal = sortedAlerts.find((a) => a.trigger_type === 'care_signal');
    if (lastCareSignal) {
      const diffMs = nowMs - new Date(lastCareSignal.sent_at).getTime();
      const limit48hMs = 48 * 60 * 60 * 1000;
      if (diffMs < limit48hMs) {
        const remainingHours = Math.ceil((limit48hMs - diffMs) / (1000 * 60 * 60));
        return {
          allowed: false,
          reason: 'distinct_note_48h',
          remainingHours,
          message:
            'Um sinal de cuidado foi enviado nas últimas 48 horas. Aguarde a aproximação pastoral antes de um novo envio.',
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Constrói payload de e-mail discreto para Sinal de Cuidado via Resend.
 * INVARIANTE: Zero conteúdo do memorial, zero dados clínicos, zero scores.
 */
export function buildCareSignalEmailPayload(params: {
  requesterName: string;
  contactName: string;
  contactEmail: string;
}): { to: string; subject: string; html: string; text: string } {
  const subject = `[Bíblia Vive] Lembrança Pastoral: ${params.requesterName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lembrança Pastoral — Atalaia</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0D11; color: #EFECE6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #18171D; border: 1px solid #2B2836; border-radius: 12px; padding: 36px 32px;">
    <div style="font-size: 11px; letter-spacing: 2px; color: #E7B075; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">
      BÍBLIA VIVE · ATALAIA
    </div>
    <h1 style="font-size: 20px; font-weight: 600; color: #F7F5F0; margin: 0 0 16px 0; line-height: 1.4;">
      Lembrete Afetuoso de Cuidado Pastoral
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 16px 0;">
      Olá, <strong>${params.contactName}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #CBC7BD; margin: 0 0 20px 0;">
      <strong>${params.requesterName}</strong> autorizou este aviso discreto para você. Ele está passando por dias pesados e expressou o desejo de ser lembrado em oração.
    </p>

    <div style="background-color: #141318; border: 1px solid #282531; border-radius: 8px; padding: 22px 24px; margin: 28px 0; text-align: center;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D6A369; margin-bottom: 6px; font-weight: 700;">
        Pacto de Confidencialidade
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 15px; color: #F5F2EB; margin-bottom: 10px;">
        "O Memorial guarda. O Atalaia cuida."
      </div>
      <div style="width: 28px; height: 1px; background-color: #383446; margin: 0 auto 12px auto;"></div>
      <p style="font-size: 13px; line-height: 1.6; color: #9E988D; margin: 0; text-align: left;">
        Nenhuma palavra da reflexão dele foi compartilhada. O diário espiritual dele diante de Deus continua totalmente privado e inviolável.
      </p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #CBC7BD; margin: 0 0 12px 0;">
      <strong>Como se aproximar?</strong> Recomendamos puxar uma conversa casual e amigável hoje, sem mencionar relatórios técnicos ou sem transparecer qualquer alarme:
    </p>

    <ul style="font-size: 13px; line-height: 1.8; color: #E7B075; padding-left: 20px; margin: 0 0 24px 0;">
      <li><em>"Olá, ${params.requesterName}! Lembrei de você em oração hoje e queria saber como você está."</em></li>
      <li><em>"Passando só para dizer que orei por você hoje. Se precisar conversar ou tomar um café, estou por aqui."</em></li>
    </ul>

    <p style="font-size: 12px; color: #726E7E; margin: 20px 0 0 0; text-align: center;">
      Você recebeu esta mensagem porque aceitou ser o Contato de Cuidado pastoral de ${params.requesterName}.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
BÍBLIA VIVE · ATALAIA
Lembrete Pastoral: ${params.requesterName}

Olá, ${params.contactName}.

${params.requesterName} autorizou este aviso discreto. Ele está passando por dias difíceis e gostaria de ser lembrado em oração.

"O Memorial guarda. O Atalaia cuida."
Nenhuma palavra do memorial foi compartilhada.

Sugestão de aproximação (sem transparecer qualquer alarme):
"Olá, ${params.requesterName}! Lembrei de você em oração hoje e queria saber como você está."
  `.trim();

  return {
    to: params.contactEmail,
    subject,
    html,
    text,
  };
}

export interface FormattedAlertHistoryItem {
  id: string;
  typeLabel: string;
  statusLabel: string;
  formattedDate: string;
  sentAt: string;
  deliveryStatus: string;
  triggerType: string;
}

/**
 * Formata os registros de alerta técnico para exibição no histórico do Leitor.
 * INVARIANTE: Zero conteúdo de memórias ou textos íntimos.
 */
export function formatAlertHistoryItem(alert: PastoralAlert): FormattedAlertHistoryItem {
  const typeLabel =
    alert.trigger_type === 'explicit_help'
      ? 'Pedido Direto de Ajuda'
      : 'Sinal de Cuidado';

  let statusLabel = 'Entregue';
  if (alert.delivery_status === 'failed') {
    statusLabel = 'Falha no Envio';
  } else if (alert.delivery_status === 'rate_limited') {
    statusLabel = 'Em Cooldown';
  } else if (alert.delivery_status === 'pending') {
    statusLabel = 'Pendente';
  }

  const d = new Date(alert.sent_at);
  const formattedDate = !isNaN(d.getTime())
    ? d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : alert.sent_at;

  return {
    id: alert.id,
    typeLabel,
    statusLabel,
    formattedDate,
    sentAt: alert.sent_at,
    deliveryStatus: alert.delivery_status,
    triggerType: alert.trigger_type,
  };
}




