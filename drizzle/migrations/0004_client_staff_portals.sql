-- Client and staff portals: account linkage, approvals, requests, and assignments.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_unique
  ON public.clients (auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS projects_assigned_staff_idx ON public.projects (assigned_staff_id);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Converted')),
  admin_notes TEXT,
  converted_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
DROP POLICY IF EXISTS service_requests_read ON public.service_requests;
DROP POLICY IF EXISTS service_requests_insert ON public.service_requests;
DROP POLICY IF EXISTS service_requests_update ON public.service_requests;
CREATE POLICY service_requests_read ON public.service_requests FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));
CREATE POLICY service_requests_insert ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));
CREATE POLICY service_requests_update ON public.service_requests FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ))
  WITH CHECK (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));
DROP TRIGGER IF EXISTS service_requests_touch ON public.service_requests;
CREATE TRIGGER service_requests_touch BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS clients_read_roles ON public.clients;
DROP POLICY IF EXISTS clients_insert_roles ON public.clients;
DROP POLICY IF EXISTS clients_update_roles ON public.clients;
CREATE POLICY clients_read_roles ON public.clients FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR auth_user_id = auth.uid());
CREATE POLICY clients_insert_roles ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin() OR auth_user_id = auth.uid());
CREATE POLICY clients_update_roles ON public.clients FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin() OR auth_user_id = auth.uid())
  WITH CHECK (public.is_staff_or_admin() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS services_read_authenticated ON public.services;
CREATE POLICY services_read_authenticated ON public.services FOR SELECT TO authenticated
  USING (status = 'Active' OR public.is_staff_or_admin());

DROP POLICY IF EXISTS projects_read_roles ON public.projects;
CREATE POLICY projects_read_roles ON public.projects FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS invoices_read_roles ON public.invoices;
CREATE POLICY invoices_read_roles ON public.invoices FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.get_my_client()
RETURNS public.clients LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c FROM public.clients c WHERE c.auth_user_id = auth.uid() LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_my_client() TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_client(_client_id UUID, _approved BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.clients
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END
  WHERE id = _client_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_client(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_client_registration(
  _full_name TEXT,
  _phone TEXT,
  _address TEXT,
  _city TEXT,
  _state TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE client_id UUID;
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'client') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.clients (auth_user_id, full_name, email, phone, address, city, state, approval_status)
  VALUES (auth.uid(), _full_name, (SELECT email FROM auth.users WHERE id = auth.uid()), _phone, _address, _city, _state, 'Pending')
  ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
    address = EXCLUDED.address, city = EXCLUDED.city, state = EXCLUDED.state
  RETURNING id INTO client_id;
  RETURN client_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_client_registration(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;