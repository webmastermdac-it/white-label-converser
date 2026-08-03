ALTER TABLE public.chatbot_configs
  ADD COLUMN IF NOT EXISTS business_vertical text NOT NULL DEFAULT 'general';

UPDATE public.chatbot_configs
SET business_vertical = CASE
  WHEN vertical = 'ecommerce' THEN 'ecommerce'
  WHEN vertical = 'booking' THEN 'booking'
  ELSE 'general'
END;

ALTER TABLE public.chatbot_configs
  ADD CONSTRAINT chatbot_configs_business_vertical_check
  CHECK (business_vertical IN ('ecommerce', 'booking', 'general'));