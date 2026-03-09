-- Migration: Add cartera (accounts receivable) table
-- This table tracks outstanding invoices and payment status per client.

CREATE TABLE public.cartera (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_name text NOT NULL,
  client_document text,
  invoice_number text,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cartera_pkey PRIMARY KEY (id),
  CONSTRAINT cartera_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT cartera_amount_check CHECK (amount >= 0),
  CONSTRAINT cartera_amount_paid_check CHECK (amount_paid >= 0 AND amount_paid <= amount)
);

-- Enable Row Level Security
ALTER TABLE public.cartera ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only access their own cartera entries
CREATE POLICY "Users can manage their own cartera"
  ON public.cartera
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries per user
CREATE INDEX cartera_user_id_idx ON public.cartera (user_id);
CREATE INDEX cartera_due_date_idx ON public.cartera (due_date);
