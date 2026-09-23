ALTER TABLE public.chatbot_configs DROP CONSTRAINT IF EXISTS chatbot_configs_business_vertical_check;
UPDATE public.chatbot_configs SET business_vertical = CASE vertical WHEN 'hospitality' THEN 'hotel' ELSE vertical END
  WHERE vertical IN ('booking','ecommerce','hospitality') AND business_vertical = 'general';
ALTER TABLE public.chatbot_configs ADD CONSTRAINT chatbot_configs_business_vertical_check
  CHECK (business_vertical IN ('ecommerce','booking','hotel','general'));
COMMENT ON COLUMN public.chatbot_configs.vertical IS 'DEPRECATED: replaced by business_vertical (ecommerce|booking|hotel|general). Not used.';