-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['cash'::character varying, 'bank'::character varying, 'credit_card'::character varying]::text[])),
  balance numeric DEFAULT 0,
  currency character varying DEFAULT 'COP'::character varying,
  color character varying,
  icon character varying,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.agent_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  shared_data jsonb NOT NULL DEFAULT '{"goals": true, "budget": true, "cartera": false, "transactions": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_config_pkey PRIMARY KEY (id),
  CONSTRAINT agent_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.agent_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb NOT NULL,
  data_snapshot jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_insights_pkey PRIMARY KEY (id),
  CONSTRAINT agent_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.budget_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  annual_revenue_target numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_config_pkey PRIMARY KEY (id),
  CONSTRAINT budget_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.budget_pockets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_pockets_pkey PRIMARY KEY (id),
  CONSTRAINT budget_pockets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cartera (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plataforma text,
  fuente text,
  producto text,
  nombre text NOT NULL,
  fecha_venta date NOT NULL,
  valor_venta numeric NOT NULL DEFAULT 0 CHECK (valor_venta > 0::numeric),
  cash numeric NOT NULL DEFAULT 0 CHECK (cash >= 0::numeric),
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  documento text,
  email text,
  telefono text,
  direccion text,
  CONSTRAINT cartera_pkey PRIMARY KEY (id),
  CONSTRAINT cartera_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cartera_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cartera_id uuid NOT NULL,
  user_id uuid NOT NULL,
  fecha date NOT NULL,
  monto numeric NOT NULL DEFAULT 0 CHECK (monto > 0::numeric),
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  transaction_id uuid,
  CONSTRAINT cartera_pagos_pkey PRIMARY KEY (id),
  CONSTRAINT cartera_pagos_cartera_id_fkey FOREIGN KEY (cartera_id) REFERENCES public.cartera(id),
  CONSTRAINT cartera_pagos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cartera_pagos_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  icon text DEFAULT 'tag'::text,
  color text DEFAULT '#D4AF37'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.credit_card_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL UNIQUE,
  credit_limit numeric NOT NULL,
  cut_off_day integer NOT NULL CHECK (cut_off_day >= 1 AND cut_off_day <= 31),
  payment_due_day integer NOT NULL CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
  interest_rate numeric,
  last_statement_balance numeric,
  last_statement_date date,
  minimum_payment numeric,
  CONSTRAINT credit_card_details_pkey PRIMARY KEY (id),
  CONSTRAINT credit_card_details_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  target numeric NOT NULL,
  current numeric DEFAULT 0,
  color character varying DEFAULT '#D4AF37'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info'::text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_status text DEFAULT 'none'::text CHECK (subscription_status = ANY (ARRAY['none'::text, 'active'::text, 'cancelled'::text])),
  phone text,
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  provider_name text,
  provider_document text,
  payment_method text,
  client_name text,
  client_document text,
  client_email text,
  client_phone text,
  client_address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT subcategories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'inactive'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text, 'past_due'::text, 'trialing'::text])),
  provider text NOT NULL DEFAULT 'stripe'::text CHECK (provider = ANY (ARRAY['stripe'::text, 'gohighlevel'::text, 'manual'::text])),
  external_id text,
  plan_name text DEFAULT 'basic'::text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transaction_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transaction_documents_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_documents_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT transaction_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['income'::character varying, 'expense'::character varying, 'transfer'::character varying]::text[])),
  amount numeric NOT NULL,
  category character varying,
  description text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invoice_number text,
  client_document text,
  client_name text,
  client_address text,
  client_email text,
  client_phone text,
  invoice_status text CHECK (invoice_status IS NULL OR (invoice_status = ANY (ARRAY['FACTURADO'::text, 'NO FACTURADO'::text]))),
  provider_document text,
  provider_name text,
  payment_method text,
  source_account text,
  destination_account text,
  account_id uuid,
  to_account_id uuid,
  cuotas integer DEFAULT 1,
  cuota_numero integer DEFAULT 1,
  cuota_parent_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_cuota_parent_id_fkey FOREIGN KEY (cuota_parent_id) REFERENCES public.transactions(id)
);