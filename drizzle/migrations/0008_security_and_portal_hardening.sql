-- Security and client portal hardening.
-- Apply after the existing migrations without rewriting migration history.

-- The current client identity column is auth_user_id. Keep the helper functions
-- aligned with registration and the client portal queries.
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_approved_client()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE auth_user_id = auth.uid() AND approval_status = 'Approved'
  )
$$;

-- Security-definer mutations must enforce the same staff boundary as the UI.
CREATE OR REPLACE FUNCTION public.save_invoice(
  _id UUID,
  _client_id UUID,
  _project_id UUID,
  _issue_date DATE,
  _due_date DATE,
  _status public.invoice_status,
  _discount NUMERIC,
  _tax NUMERIC,
  _notes TEXT,
  _items JSONB
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  item JSONB;
  saved_invoice public.invoices%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.invoices (
      invoice_number, client_id, project_id, issue_date, due_date,
      discount, tax, status, notes, subtotal
    )
    VALUES (
      '', _client_id, _project_id, _issue_date, _due_date,
      COALESCE(_discount, 0), COALESCE(_tax, 0), _status, _notes, 0
    )
    RETURNING id INTO target_id;
  ELSE
    UPDATE public.invoices
    SET client_id = _client_id,
        project_id = _project_id,
        issue_date = _issue_date,
        due_date = _due_date,
        discount = COALESCE(_discount, 0),
        tax = COALESCE(_tax, 0),
        status = _status,
        notes = _notes
    WHERE id = _id
    RETURNING id INTO target_id;

    IF target_id IS NULL THEN
      RAISE EXCEPTION 'Invoice not found';
    END IF;

    DELETE FROM public.invoice_items WHERE invoice_id = target_id;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    INSERT INTO public.invoice_items (
      invoice_id, service_id, description, quantity, unit_price
    )
    VALUES (
      target_id,
      NULLIF(item->>'service_id', '')::UUID,
      item->>'description',
      COALESCE((item->>'quantity')::NUMERIC, 1),
      COALESCE((item->>'unit_price')::NUMERIC, 0)
    );
  END LOOP;

  SELECT * INTO saved_invoice FROM public.invoices WHERE id = target_id;
  RETURN saved_invoice;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_quote public.quotes%ROWTYPE;
  new_invoice UUID;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  SELECT * INTO source_quote
  FROM public.quotes
  WHERE id = _quote_id
  FOR UPDATE;

  IF source_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  IF source_quote.status IN ('Rejected', 'Expired', 'Converted') THEN
    RAISE EXCEPTION 'Quote cannot be converted from its current status';
  END IF;

  INSERT INTO public.invoices (
    invoice_number, client_id, project_id, issue_date, due_date,
    discount, tax, status, notes
  )
  VALUES (
    '', source_quote.client_id, source_quote.project_id, CURRENT_DATE,
    source_quote.expiry_date, source_quote.discount, source_quote.tax,
    'Draft', source_quote.notes
  )
  RETURNING id INTO new_invoice;

  INSERT INTO public.invoice_items (
    invoice_id, service_id, description, quantity, unit_price
  )
  SELECT new_invoice, service_id, description, quantity, unit_price
  FROM public.quote_items
  WHERE quote_id = _quote_id;

  UPDATE public.quotes
  SET status = 'Converted', updated_at = now()
  WHERE id = _quote_id;

  RETURN new_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_invoice(
  UUID, UUID, UUID, DATE, DATE, public.invoice_status,
  NUMERIC, NUMERIC, TEXT, JSONB
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(UUID) TO authenticated;

-- Staff should only see and update projects explicitly assigned to them.
DROP POLICY IF EXISTS projects_read_staff ON public.projects;
DROP POLICY IF EXISTS projects_insert_staff ON public.projects;
DROP POLICY IF EXISTS projects_insert_admin ON public.projects;
DROP POLICY IF EXISTS projects_update_staff ON public.projects;
DROP POLICY IF EXISTS projects_delete_admin ON public.projects;
CREATE POLICY projects_read_staff ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_staff_or_admin() AND assigned_staff_id = auth.uid()));
CREATE POLICY projects_insert_admin ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY projects_update_staff ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_staff_or_admin() AND assigned_staff_id = auth.uid()))
  WITH CHECK (public.is_admin() OR (public.is_staff_or_admin() AND assigned_staff_id = auth.uid()));
CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE TO authenticated USING (public.is_admin());

-- Delivery records follow the same project assignment boundary.
DROP POLICY IF EXISTS project_milestones_read_staff ON public.project_milestones;
DROP POLICY IF EXISTS project_milestones_insert_staff ON public.project_milestones;
DROP POLICY IF EXISTS project_milestones_update_staff ON public.project_milestones;
DROP POLICY IF EXISTS project_milestones_delete_admin ON public.project_milestones;
DROP POLICY IF EXISTS project_tasks_read_staff ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_insert_staff ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_update_staff ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_delete_admin ON public.project_tasks;
DROP POLICY IF EXISTS project_files_read_staff ON public.project_files;
DROP POLICY IF EXISTS project_files_insert_staff ON public.project_files;
DROP POLICY IF EXISTS project_files_update_staff ON public.project_files;
DROP POLICY IF EXISTS project_files_delete_admin ON public.project_files;

CREATE POLICY project_milestones_read_staff ON public.project_milestones FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_milestones_insert_staff ON public.project_milestones FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_milestones_update_staff ON public.project_milestones FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_milestones_delete_admin ON public.project_milestones FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY project_tasks_read_staff ON public.project_tasks FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_tasks_insert_staff ON public.project_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_tasks_update_staff ON public.project_tasks FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_tasks_delete_admin ON public.project_tasks FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY project_files_read_staff ON public.project_files FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_files_insert_staff ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_files_update_staff ON public.project_files FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assigned_staff_id = auth.uid()));
CREATE POLICY project_files_delete_admin ON public.project_files FOR DELETE TO authenticated USING (public.is_admin());
