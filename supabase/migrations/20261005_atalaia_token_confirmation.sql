-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 33 — Atalaia: Funções RPC para Confirmação de Convite Web (ADR 0002)
-- Permite que o pastor confirme ou decline via token web seguro e descartável
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adicionar coluna token_expires_at se ainda não existir
ALTER TABLE public.pastoral_contacts
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- 2. Função segura para consultar dados do convite na página web (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_pastoral_invitation_info(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact public.pastoral_contacts%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_contact
  FROM public.pastoral_contacts
  WHERE confirmation_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF v_contact.status != 'pending' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'already_processed',
      'status', v_contact.status
    );
  END IF;

  IF v_contact.token_expires_at IS NOT NULL AND v_contact.token_expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'contact_name', v_contact.name,
    'requester_name', v_contact.requester_name,
    'role', v_contact.role
  );
END;
$$;

-- 3. Função segura para aceitar ou declinar o convite via token (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.confirm_pastoral_contact_by_token(
  p_token text,
  p_action text -- 'accept' ou 'decline'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact public.pastoral_contacts%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Token de confirmação inválido ou ausente.'
    );
  END IF;

  -- Localizar o contato com bloqueio FOR UPDATE
  SELECT * INTO v_contact
  FROM public.pastoral_contacts
  WHERE confirmation_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Token de confirmação inválido ou já utilizado.'
    );
  END IF;

  -- Validar se ainda está em pending
  IF v_contact.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_processed',
      'message', 'Este convite já foi processado anteriormente.'
    );
  END IF;

  -- Validar expiração de 48h
  IF v_contact.token_expires_at IS NOT NULL AND v_contact.token_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'expired',
      'message', 'Este convite expirou (validade máxima de 48 horas).'
    );
  END IF;

  -- Processar ação
  IF p_action = 'accept' THEN
    -- Desativar qualquer outro contato ativo prévio do mesmo leitor
    UPDATE public.pastoral_contacts
    SET status = 'revoked',
        revoked_at = now(),
        updated_at = now()
    WHERE user_id = v_contact.user_id
      AND id != v_contact.id
      AND status = 'active';

    -- Ativar o contato atual e invalidar o token
    UPDATE public.pastoral_contacts
    SET status = 'active',
        verified_at = now(),
        confirmation_token = NULL,
        updated_at = now()
    WHERE id = v_contact.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'active',
      'requester_name', v_contact.requester_name,
      'role', v_contact.role
    );
  ELSIF p_action = 'decline' OR p_action = 'reject' THEN
    UPDATE public.pastoral_contacts
    SET status = 'rejected',
        confirmation_token = NULL,
        updated_at = now()
    WHERE id = v_contact.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'requester_name', v_contact.requester_name
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_action',
      'message', 'Ação inválida. Utilize accept ou decline.'
    );
  END IF;
END;
$$;

-- 4. Concessão de permissões
GRANT EXECUTE ON FUNCTION public.get_pastoral_invitation_info(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_pastoral_contact_by_token(text, text) TO anon, authenticated, service_role;
