ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;
COMMENT ON COLUMN public.leads.booking IS 'Hotel stay request: {check_in, check_out, adults, children, room_id, room_name}';
COMMENT ON COLUMN public.leads.source IS 'Lead origin, e.g. hotel_quote';