-- Self-registration for staff and clients with explicit administrator approval.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));

-- Existing accounts, including the initial administrator, remain usable.
UPDATE public.clients
SET approval_status = CASE lower(approval_status)
  WHEN 'approved' THEN 'Approved'
  WHEN 'rejected' THEN 'Rejected'
  ELSE 'Pending'
END
WHERE approval_status IS NOT NULL;

UPDATE public.profiles
SET approval_status = 'Approved'
WHERE approval_status IS NULL OR approval_status = 'Pending';
UPDATE public.profiles p
SET approval_status = c.approval_status
FROM public.clients c
WHERE c.auth_user_id = p.id AND c.approval_status <> 'Approved';

CREATE OR REPLACE FUNCTION public.finalize_staff_registration(
  _full_name TEXT,
  _phone TEXT,
  _job_title TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_id UUID := auth.uid();
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (profile_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET full_name = _full_name,
      phone = _phone,
      job_title = _job_title,
      approval_status = 'Pending',
      is_active = true
  WHERE id = profile_id;

  RETURN profile_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_staff_registration(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_staff(_user_id UUID, _approved BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.profiles
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END,
      is_active = _approved
  WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_staff(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_staff_active(_user_id UUID, _active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.profiles
  SET is_active = _active,
      approval_status = CASE WHEN _active THEN 'Approved' ELSE approval_status END
  WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_staff_active(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_client(_client_id UUID, _approved BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.clients
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END
  WHERE id = _client_id;

  UPDATE public.profiles p
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END,
      is_active = _approved
  FROM public.clients c
  WHERE c.id = _client_id AND p.id = c.auth_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_client(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'Pending')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data->>'account_type' = 'staff' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles
    SET phone = NEW.raw_user_meta_data->>'phone',
        job_title = NEW.raw_user_meta_data->>'job_title'
    WHERE id = NEW.id;
  ELSIF NEW.raw_user_meta_data->>'account_type' = 'client' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.clients (auth_user_id, full_name, email, phone, address, city, state, approval_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state',
      'Pending'
    )
    ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Approval is enforced in database policies, not only in the application UI.
CREATE OR REPLACE FUNCTION public.is_approved_client()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.profiles p ON p.id = c.auth_user_id
    WHERE c.auth_user_id = auth.uid()
      AND c.approval_status = 'Approved'
      AND p.approval_status = 'Approved'
      AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id
      AND (
        r.role = 'admin'
        OR (r.role = 'staff' AND p.approval_status = 'Approved' AND p.is_active = true)
      )
  )
$$;

-- Remove earlier permissive policies from the portal migrations.
DROP POLICY IF EXISTS clients_self_read ON public.clients;
DROP POLICY IF EXISTS clients_self_insert ON public.clients;
DROP POLICY IF EXISTS clients_self_update ON public.clients;
DROP POLICY IF EXISTS clients_read_roles ON public.clients;
DROP POLICY IF EXISTS clients_insert_roles ON public.clients;
DROP POLICY IF EXISTS clients_update_roles ON public.clients;
DROP POLICY IF EXISTS projects_client_read ON public.projects;
DROP POLICY IF EXISTS projects_read_roles ON public.projects;
DROP POLICY IF EXISTS invoices_client_read ON public.invoices;
DROP POLICY IF EXISTS invoices_read_roles ON public.invoices;
DROP POLICY IF EXISTS payments_client_read ON public.payments;
DROP POLICY IF EXISTS project_milestones_client_read ON public.project_milestones;
DROP POLICY IF EXISTS service_requests_client_read ON public.service_requests;
DROP POLICY IF EXISTS service_requests_client_insert ON public.service_requests;
DROP POLICY IF EXISTS service_requests_read ON public.service_requests;
DROP POLICY IF EXISTS service_requests_insert ON public.service_requests;
DROP POLICY IF EXISTS service_requests_update ON public.service_requests;
DROP POLICY IF EXISTS services_read_authenticated ON public.services;
DROP POLICY IF EXISTS service_categories_read_authenticated ON public.service_categories;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
DROP POLICY IF EXISTS categories_rw ON public.service_categories;
DROP POLICY IF EXISTS activity_insert_self ON public.activity_log;

CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY profiles_insert_self_or_admin ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR (auth.uid() = id AND approval_status = 'Pending'));
CREATE POLICY activity_insert_approved ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin() AND (actor_id IS NULL OR actor_id = auth.uid()));

CREATE POLICY clients_read_approved ON public.clients FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (auth_user_id = auth.uid() AND public.is_approved_client()));
CREATE POLICY clients_insert_admin ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin());
CREATE POLICY clients_update_approved ON public.clients FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin() OR (auth_user_id = auth.uid() AND public.is_approved_client()))
  WITH CHECK (public.is_staff_or_admin() OR (auth_user_id = auth.uid() AND public.is_approved_client()));

CREATE POLICY projects_read_approved ON public.projects FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));
CREATE POLICY project_milestones_read_approved ON public.project_milestones FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.client_id = public.current_client_id() AND public.is_approved_client()
  )));
CREATE POLICY invoices_read_approved ON public.invoices FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));
CREATE POLICY invoice_items_read_approved ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.client_id = public.current_client_id() AND public.is_approved_client()
  )));
CREATE POLICY payments_read_approved ON public.payments FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));

CREATE POLICY service_requests_read_approved ON public.service_requests FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));
CREATE POLICY service_requests_insert_approved ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() AND public.is_approved_client());
CREATE POLICY service_requests_update_approved ON public.service_requests FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()))
  WITH CHECK (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));

CREATE POLICY services_read_approved ON public.services FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (status = 'Active' AND public.is_approved_client()));
CREATE POLICY service_categories_read_approved ON public.service_categories FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR public.is_approved_client());
