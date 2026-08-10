ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS products_added integer NOT NULL DEFAULT 0;
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS products_updated integer NOT NULL DEFAULT 0;
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS products_removed integer NOT NULL DEFAULT 0;