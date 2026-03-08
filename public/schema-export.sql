-- ============================================
-- RentEase Kenya — Full Database Schema Export
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Enum
CREATE TYPE public.app_role AS ENUM ('landlord', 'tenant');

-- 2. Tables

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  property_type text DEFAULT 'apartment',
  total_units integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  unit_number text NOT NULL,
  rent_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'vacant',
  tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  tenant_id uuid,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'completed',
  mpesa_ref text,
  checkout_request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  landlord_id uuid NOT NULL,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL,
  tenant_phone text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id),
  tenant_id uuid,
  title text NOT NULL,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Functions

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'landlord'));

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Triggers

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- properties
CREATE POLICY "Landlords can manage own properties" ON public.properties FOR ALL
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

-- units
CREATE POLICY "Landlords can manage units of own properties" ON public.units FOR ALL
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.landlord_id = auth.uid()));

CREATE POLICY "Tenants can view assigned units" ON public.units FOR SELECT
  USING (auth.uid() = tenant_id);

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Landlords can view tenant profiles" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM units u JOIN properties p ON u.property_id = p.id WHERE u.tenant_id = profiles.user_id AND p.landlord_id = auth.uid()));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- payments
CREATE POLICY "Landlords can insert payments for own units" ON public.payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = payments.unit_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Landlords can view payments for own units" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = payments.unit_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants can view own payments" ON public.payments FOR SELECT
  USING (auth.uid() = tenant_id);

-- tenant_invitations
CREATE POLICY "Landlords can manage own invitations" ON public.tenant_invitations FOR ALL
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Invitees can view their invitation" ON public.tenant_invitations FOR SELECT
  USING (tenant_email = (auth.jwt() ->> 'email'));

-- maintenance_requests
CREATE POLICY "Landlords can manage maintenance for own properties" ON public.maintenance_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = maintenance_requests.unit_id AND p.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM units u JOIN properties p ON u.property_id = p.id WHERE u.id = maintenance_requests.unit_id AND p.landlord_id = auth.uid()));

CREATE POLICY "Tenants can view own requests" ON public.maintenance_requests FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create requests" ON public.maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update own requests" ON public.maintenance_requests FOR UPDATE
  USING (auth.uid() = tenant_id);

-- notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-images', 'maintenance-images', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Realtime (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
