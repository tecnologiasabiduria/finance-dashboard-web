-- =============================================================================
-- MIGRATIONS — Finance Dashboard
-- Ejecutar en: Supabase → SQL Editor
-- =============================================================================


-- =============================================================================
-- [2026-03-30] Documentos adjuntos a transacciones
-- =============================================================================

-- 1. Storage bucket (privado, max 10 MB, solo PDF e imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-documents',
  'transaction-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabla de documentos
CREATE TABLE IF NOT EXISTS transaction_documents (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  file_name      TEXT        NOT NULL,
  file_path      TEXT        NOT NULL,
  file_size      INTEGER,
  mime_type      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS en la tabla
