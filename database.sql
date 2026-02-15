-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_status text DEFAULT 'none'::text CHECK (subscription_status = ANY (ARRAY['none'::text, 'active'::text, 'cancelled'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
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
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[])),
  amount numeric NOT NULL,
  category character varying NOT NULL,
  description text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);