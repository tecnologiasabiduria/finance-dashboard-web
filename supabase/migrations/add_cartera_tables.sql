-- Migration: Add Cartera (accounts receivable) tables
-- Run this in the Supabase SQL editor

-- ============================================================
-- TABLE: cartera
-- Tracks accounts receivable (cuentas por cobrar) per client
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cartera (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plataforma text,
  fuente text,
  producto text,
  nombre text NOT NULL,
  fecha_venta date NOT NULL,
  valor_venta numeric NOT NULL DEFAULT 0,
  cash numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cartera_pkey PRIMARY KEY (id),
  CONSTRAINT cartera_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: cartera_pagos
-- Tracks individual monthly payments against a cartera record
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cartera_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartera_id uuid NOT NULL,
  user_id uuid NOT NULL,
  fecha date NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cartera_pagos_pkey PRIMARY KEY (id),
  CONSTRAINT cartera_pagos_cartera_id_fkey FOREIGN KEY (cartera_id)
    REFERENCES public.cartera(id) ON DELETE CASCADE,
  CONSTRAINT cartera_pagos_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS cartera_user_id_idx ON public.cartera(user_id);
CREATE INDEX IF NOT EXISTS cartera_fecha_venta_idx ON public.cartera(fecha_venta);
CREATE INDEX IF NOT EXISTS cartera_pagos_cartera_id_idx ON public.cartera_pagos(cartera_id);
CREATE INDEX IF NOT EXISTS cartera_pagos_user_id_idx ON public.cartera_pagos(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only access their own records
-- ============================================================

-- Enable RLS on cartera
ALTER TABLE public.cartera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own cartera records"
  ON public.cartera
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on cartera_pagos
ALTER TABLE public.cartera_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own cartera payments"
  ON public.cartera_pagos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_cartera_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cartera_updated_at
  BEFORE UPDATE ON public.cartera
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cartera_updated_at();
