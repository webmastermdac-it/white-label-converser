
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'client');

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table (linked to auth users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create chatbot_configs table
CREATE TABLE public.chatbot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Chatbot',
  avatar TEXT DEFAULT '🤖',
  primary_color TEXT DEFAULT '#E94560',
  background_color TEXT DEFAULT '#1A1A2E',
  text_color TEXT DEFAULT '#FFFFFF',
  welcome_message TEXT DEFAULT 'Ciao! Come posso aiutarti oggi?',
  knowledge_base TEXT DEFAULT '',
  fallback_message TEXT DEFAULT 'Non ho questa informazione, ma posso metterti in contatto con un nostro consulente!',
  calendly_url TEXT DEFAULT '',
  notification_email TEXT DEFAULT '',
  email_notifications_enabled BOOLEAN DEFAULT true,
  launcher_position TEXT DEFAULT 'bottom-right',
  embed_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.chatbot_configs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  transcript JSONB DEFAULT '[]',
  source_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.chatbot_configs(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  session_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  source_url TEXT DEFAULT ''
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for clients
CREATE POLICY "Super admins can manage all clients" ON public.clients
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can view their own client record" ON public.clients
  FOR SELECT USING (id = public.get_user_client_id(auth.uid()));

-- RLS Policies for chatbot_configs
CREATE POLICY "Super admins can manage all chatbot configs" ON public.chatbot_configs
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can view and update their own chatbot" ON public.chatbot_configs
  FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Clients can update their own chatbot" ON public.chatbot_configs
  FOR UPDATE USING (client_id = public.get_user_client_id(auth.uid()));

-- Public access for widget (by embed_token - handled in edge function, no RLS needed for anon)
CREATE POLICY "Anon can read chatbot config by embed token" ON public.chatbot_configs
  FOR SELECT TO anon USING (true);

-- RLS Policies for leads
CREATE POLICY "Super admins can manage all leads" ON public.leads
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can view their own leads" ON public.leads
  FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Clients can update their own leads" ON public.leads
  FOR UPDATE USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Anon can insert leads (widget)" ON public.leads
  FOR INSERT TO anon WITH CHECK (true);

-- RLS Policies for chat_sessions
CREATE POLICY "Super admins can manage all chat sessions" ON public.chat_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can view their own chat sessions" ON public.chat_sessions
  FOR SELECT USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Anon can insert and update chat sessions (widget)" ON public.chat_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update chat sessions (widget)" ON public.chat_sessions
  FOR UPDATE TO anon USING (true);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chatbot_configs_updated_at BEFORE UPDATE ON public.chatbot_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
