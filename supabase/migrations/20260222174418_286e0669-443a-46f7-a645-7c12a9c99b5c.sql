
-- Create ecommerce_configs table
CREATE TABLE public.ecommerce_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'woocommerce',
  store_url text NOT NULL DEFAULT '',
  api_key text DEFAULT '',
  api_secret text DEFAULT '',
  feed_url text DEFAULT '',
  feed_format text DEFAULT 'xml',
  webhook_secret text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  sync_enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.ecommerce_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own ecommerce config"
  ON public.ecommerce_configs FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Clients can insert their own ecommerce config"
  ON public.ecommerce_configs FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Clients can update their own ecommerce config"
  ON public.ecommerce_configs FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Super admins can manage all ecommerce configs"
  ON public.ecommerce_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  external_id text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price decimal NOT NULL DEFAULT 0,
  sale_price decimal,
  currency text NOT NULL DEFAULT 'EUR',
  in_stock boolean NOT NULL DEFAULT true,
  stock_quantity integer,
  categories text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  variants jsonb DEFAULT '[]'::jsonb,
  image_url text,
  product_url text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(client_id, external_id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own products"
  ON public.products FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Super admins can manage all products"
  ON public.products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create sync_logs table
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  products_synced integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'running'
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own sync logs"
  ON public.sync_logs FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid()));

CREATE POLICY "Super admins can manage all sync logs"
  ON public.sync_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add knowledge_base_products column to chatbot_configs
ALTER TABLE public.chatbot_configs ADD COLUMN IF NOT EXISTS knowledge_base_products text DEFAULT '';

-- Allow anon to read products for widget context (read-only via embed token)
CREATE POLICY "Anon can read products via bot config"
  ON public.products FOR SELECT TO anon
  USING (true);
