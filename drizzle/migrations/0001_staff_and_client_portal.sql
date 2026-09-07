-- Client self-registration linkage
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_id_key ON public.clients(user_id) WHERE user_id IS NOT NULL;

-- Staff assignment on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assigned_staff_id uuid;
CREATE INDEX IF NOT EXISTS projects_assigned_staff_idx ON public.projects(assigned_staff_id);

-- Helper: the client record belonging to the signed-in user
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_approved_client()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE user_id = auth.uid() AND approval_status = 'approved'
  )
$$;

-- Service requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  title text NOT NULL,
  details text,
  institution text,
  budget numeric NOT NULL DEFAULT 0,
  preferred_deadline date,
  status text NOT NULL DEFAULT 'Pending',
  admin_note text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_requests_staff_read ON public.service_requests
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());
CREATE POLICY service_requests_staff_update ON public.service_requests
  FOR UPDATE TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY service_requests_admin_delete ON public.service_requests
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY service_requests_client_read ON public.service_requests
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());
CREATE POLICY service_requests_client_insert ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() AND public.is_approved_client() AND status = 'Pending');

CREATE TRIGGER service_requests_touch
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-facing read/write access to their own data
CREATE POLICY clients_self_read ON public.clients
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY clients_self_insert ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND approval_status = 'pending');
CREATE POLICY clients_self_update ON public.clients
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_client_read ON public.projects
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());
CREATE POLICY project_milestones_client_read ON public.project_milestones
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = public.current_client_id())
  );
CREATE POLICY invoices_client_read ON public.invoices
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());
CREATE POLICY invoice_items_client_read ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.client_id = public.current_client_id())
  );
CREATE POLICY payments_client_read ON public.payments
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- Any signed-in user may browse the service catalogue
CREATE POLICY services_read_authenticated ON public.services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY service_categories_read_authenticated ON public.service_categories
  FOR SELECT TO authenticated USING (true);
