
-- Add locale column to email_templates
ALTER TABLE public.email_templates ADD COLUMN locale text NOT NULL DEFAULT 'it';

-- Drop the old unique constraint on type only, add new one on type+locale
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_type_key;
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_type_locale_key UNIQUE (type, locale);

-- Drop the old CHECK constraint and re-add it (same values)
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_type_check;
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_type_check 
  CHECK (type IN ('welcome', 'reset_password', 'chatbot_notification', 'weekly_summary'));

-- Add locale CHECK
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_locale_check 
  CHECK (locale IN ('it', 'en'));

-- Add language field to profiles for user preferred language
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'it';
