ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS ecommerce_integration boolean NOT NULL DEFAULT false;

UPDATE public.plan_configs SET ecommerce_integration = false WHERE plan_name = 'free';
UPDATE public.plan_configs SET ecommerce_integration = false WHERE plan_name = 'starter';
UPDATE public.plan_configs SET ecommerce_integration = true WHERE plan_name = 'pro';