-- Remove deprecated 'aprovado' column (we use status_aprovacao now)
ALTER TABLE public.perfis DROP COLUMN IF EXISTS aprovado;