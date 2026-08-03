ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS max_products integer NOT NULL DEFAULT 100;

UPDATE public.plan_configs SET max_products = 0 WHERE plan_name = 'free';
UPDATE public.plan_configs SET max_products = 100 WHERE plan_name = 'starter';
UPDATE public.plan_configs SET max_products = -1 WHERE plan_name = 'pro';