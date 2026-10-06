-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 34 — Ecossistema Completo de Cuidado Pastoral (4 Pilares)
-- ADR 0001 (Telemetria Cega), ADR 0003 (Tabela Dedicada), ADR 0004 (Auditoria Mínima)
-- 
-- 4 Pilares de Cuidado Pastoral:
-- 1. CRISIS: Dor, desespero, luto, ideação de desistência ou crise espiritual grave.
-- 2. THEOLOGICAL_QUERY: Reflexão bíblica profunda, dúvida exegética ou passagem difícil.
-- 3. THANKSGIVING: Testemunho de vitória, conquista, paz, alegria ou gratidão a Deus.
-- 4. ANSWERED_PRAYER: Marcação explícita de uma oração que foi respondida.
--
-- Execute este arquivo no SQL Editor do Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Criar Enum pastoral_intent_type ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.pastoral_intent_type AS ENUM (
    'CRISIS',
    'THEOLOGICAL_QUERY',
    'THANKSGIVING',
    'ANSWERED_PRAYER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE public.pastoral_intent_type IS 'Taxonomia canônica do Ecossistema de Cuidado Pastoral: CRISIS, THEOLOGICAL_QUERY, THANKSGIVING, ANSWERED_PRAYER';

-- ── 2. Evolução da Tabela user_notes (Marcos de Fé / Memórias) ────────────────

ALTER TABLE public.user_notes
  ADD COLUMN IF NOT EXISTS pastoral_intent public.pastoral_intent_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pastoral_intent_confidence numeric(3, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pastoral_intent_evaluated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pastoral_intent_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pastoral_alert_sent_types text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.user_notes.pastoral_intent IS 'Intenção pastoral dominante classificada via JEV (TypeSafe AI)';
COMMENT ON COLUMN public.user_notes.pastoral_intent_confidence IS 'Grau de confiança da inferência (0.00 a 1.00)';
COMMENT ON COLUMN public.user_notes.pastoral_intent_evaluated_at IS 'Data e hora da avaliação pelo JEV';
COMMENT ON COLUMN public.user_notes.pastoral_alert_sent_types IS 'Histórico de tipos de notificações pastorais já disparadas para esta memória';

-- ── 3. Evolução da Tabela pastoral_alerts (Auditoria Técnica Mínima) ──────────

ALTER TABLE public.pastoral_alerts
  ADD COLUMN IF NOT EXISTS pastoral_intent public.pastoral_intent_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS biblical_reference text DEFAULT NULL;

-- Atualizar constraint de trigger_type para acomodar os 4 pilares preservando legado
ALTER TABLE public.pastoral_alerts
  DROP CONSTRAINT IF EXISTS pastoral_alerts_trigger_type_check;

ALTER TABLE public.pastoral_alerts
  ADD CONSTRAINT pastoral_alerts_trigger_type_check
  CHECK (trigger_type IN ('care_signal', 'explicit_help', 'CRISIS', 'THEOLOGICAL_QUERY', 'THANKSGIVING', 'ANSWERED_PRAYER'));

-- ── 4. View de Compatibilidade memorial_entries ───────────────────────────────

CREATE OR REPLACE VIEW public.memorial_entries AS
  SELECT 
    id,
    user_id,
    type,
    title,
    content,
    book_id,
    book_name,
    chapter,
    verse,
    verse_id,
    tags,
    metadata,
    status,
    favorite,
    answered_at,
    answered_note,
    pastoral_intent,
    pastoral_intent_confidence,
    pastoral_intent_evaluated_at,
    pastoral_intent_reason,
    pastoral_alert_sent_types,
    created_at,
    updated_at
  FROM public.user_notes;

-- ── 5. Índices de Alta Eficiência ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_notes_pastoral_intent
  ON public.user_notes (user_id, pastoral_intent)
  WHERE pastoral_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notes_intent_confidence
  ON public.user_notes (user_id, pastoral_intent, pastoral_intent_confidence DESC)
  WHERE pastoral_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pastoral_alerts_intent
  ON public.pastoral_alerts (user_id, pastoral_intent, sent_at DESC)
  WHERE pastoral_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pastoral_alerts_note_intent
  ON public.pastoral_alerts (note_id, pastoral_intent, sent_at DESC)
  WHERE note_id IS NOT NULL;

-- ── 6. Permissões de RLS e Acesso ─────────────────────────────────────────────

-- Grants para authenticated e service_role
GRANT SELECT, UPDATE ON public.user_notes TO authenticated;
GRANT SELECT, INSERT ON public.pastoral_alerts TO authenticated;
GRANT SELECT ON public.memorial_entries TO authenticated;

GRANT ALL ON public.user_notes TO service_role;
GRANT ALL ON public.pastoral_alerts TO service_role;
GRANT ALL ON public.memorial_entries TO service_role;
