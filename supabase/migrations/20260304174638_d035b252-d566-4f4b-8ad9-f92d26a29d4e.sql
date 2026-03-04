ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS chat_model text NOT NULL DEFAULT 'gpt-4o-mini';

UPDATE public.plan_configs SET chat_model = 'gpt-4o-mini' WHERE plan_name = 'free';
UPDATE public.plan_configs SET chat_model = 'gpt-4o-mini' WHERE plan_name = 'starter';
UPDATE public.plan_configs SET chat_model = 'gpt-4o' WHERE plan_name = 'pro';