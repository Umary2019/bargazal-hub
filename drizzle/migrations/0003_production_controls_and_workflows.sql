-- Production controls, payment integrity, quotations, and project delivery.

-- New users must be explicitly assigned a role by an administrator.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Replace broad authenticated-user policies with role-aware policies.
DROP POLICY IF EXISTS "settings_rw" ON public.business_settings;
DROP POLICY IF EXISTS "settings_read_staff" ON public.business_settings;
DROP POLICY IF EXISTS "settings_write_admin" ON public.business_settings;
CREATE POLICY "settings_read_staff" ON public.business_settings FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());
CREATE POLICY "settings_write_admin" ON public.business_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clients', 'service_categories', 'services', 'projects', 'project_services',
    'invoices', 'invoice_items', 'payments', 'expenses'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_rw', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_read_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_admin', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff_or_admin())', table_name || '_read_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin())', table_name || '_insert_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin())', table_name || '_update_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', table_name || '_delete_admin', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_manage" ON public.user_roles;
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = id);

DROP POLICY IF EXISTS "activity_read" ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert" ON public.activity_log;
DROP POLICY IF EXISTS "activity_read_staff" ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert_self" ON public.activity_log;
CREATE POLICY "activity_read_staff" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());
CREATE POLICY "activity_insert_self" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- Payment ledger: void payments instead of deleting financial history.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_invoice_reference_unique
  ON public.payments (invoice_id, reference)
  WHERE invoice_id IS NOT NULL AND reference IS NOT NULL AND voided_at IS NULL;

CREATE OR REPLACE FUNCTION public.apply_payment_rollups()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv UUID; prj UUID;
BEGIN
  PERFORM set_config('app.payment_rollup', 'on', true);
  FOR inv IN SELECT DISTINCT x FROM unnest(ARRAY[
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.invoice_id ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.invoice_id ELSE NULL END
  ]) AS x WHERE x IS NOT NULL LOOP
    UPDATE public.invoices i
      SET amount_paid = COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.invoice_id = i.id AND p.voided_at IS NULL), 0)
    WHERE i.id = inv;
  END LOOP;
  FOR prj IN SELECT DISTINCT x FROM unnest(ARRAY[
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.project_id ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.project_id ELSE NULL END
  ]) AS x WHERE x IS NOT NULL LOOP
    UPDATE public.projects pr
      SET amount_paid = COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.project_id = pr.id AND p.voided_at IS NULL), 0)
    WHERE pr.id = prj;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_manual_payment_rollup_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
     AND current_setting('app.payment_rollup', true) IS DISTINCT FROM 'on' THEN
    NEW.amount_paid := OLD.amount_paid;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invoices_prevent_manual_payment_change ON public.invoices;
CREATE TRIGGER invoices_prevent_manual_payment_change
  BEFORE UPDATE ON public.invoices FOR EACH ROW
  EXECUTE FUNCTION public.prevent_manual_payment_rollup_change();

DROP TRIGGER IF EXISTS projects_prevent_manual_payment_change ON public.projects;
CREATE TRIGGER projects_prevent_manual_payment_change
  BEFORE UPDATE ON public.projects FOR EACH ROW
  EXECUTE FUNCTION public.prevent_manual_payment_rollup_change();

CREATE OR REPLACE FUNCTION public.validate_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE already_paid NUMERIC(14,2); invoice_total NUMERIC(14,2);
BEGIN
  IF NEW.invoice_id IS NULL OR NEW.voided_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT total INTO invoice_total FROM public.invoices WHERE id = NEW.invoice_id FOR UPDATE;
  SELECT COALESCE(SUM(amount), 0) INTO already_paid
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND voided_at IS NULL
    AND (TG_OP <> 'UPDATE' OR id <> OLD.id);

  IF invoice_total IS NULL OR already_paid + NEW.amount > invoice_total THEN
    RAISE EXCEPTION 'Payment exceeds the invoice balance';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payments_validate_amount ON public.payments;
CREATE TRIGGER payments_validate_amount
  BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_amount();

-- Quotations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'quote_status') THEN
    CREATE TYPE public.quote_status AS ENUM ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted');
  END IF;
END $$;
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status public.quote_status NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'BTS-QUO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quote_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS quotes_number ON public.quotes;
CREATE TRIGGER quotes_number BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_quote_number();
CREATE OR REPLACE FUNCTION public.recalc_quote_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quote UUID; sub NUMERIC(14,2);
BEGIN
  quote := COALESCE(NEW.quote_id, OLD.quote_id);
  SELECT COALESCE(SUM(total), 0) INTO sub FROM public.quote_items WHERE quote_id = quote;
  UPDATE public.quotes SET subtotal = sub, total = GREATEST(sub - discount + tax, 0) WHERE id = quote;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS quote_items_recalc ON public.quote_items;
CREATE TRIGGER quote_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_quote_totals();
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes, public.quote_items TO authenticated;
DROP POLICY IF EXISTS "quotes_read_staff" ON public.quotes;
DROP POLICY IF EXISTS "quotes_write_staff" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_staff" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_admin" ON public.quotes;
DROP POLICY IF EXISTS "quote_items_read_staff" ON public.quote_items;
DROP POLICY IF EXISTS "quote_items_write_staff" ON public.quote_items;
DROP POLICY IF EXISTS "quote_items_update_staff" ON public.quote_items;
DROP POLICY IF EXISTS "quote_items_delete_admin" ON public.quote_items;
CREATE POLICY "quotes_read_staff" ON public.quotes FOR SELECT TO authenticated USING (public.is_staff_or_admin());
CREATE POLICY "quotes_write_staff" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "quotes_update_staff" ON public.quotes FOR UPDATE TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "quotes_delete_admin" ON public.quotes FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "quote_items_read_staff" ON public.quote_items FOR SELECT TO authenticated USING (public.is_staff_or_admin());
CREATE POLICY "quote_items_write_staff" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "quote_items_update_staff" ON public.quote_items FOR UPDATE TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
CREATE POLICY "quote_items_delete_admin" ON public.quote_items FOR DELETE TO authenticated USING (public.is_admin());

-- Project delivery records.
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Blocked')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done', 'Blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones, public.project_tasks, public.project_files TO authenticated;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['project_milestones', 'project_tasks', 'project_files'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_read_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_staff', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_admin', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff_or_admin())', table_name || '_read_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin())', table_name || '_insert_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin())', table_name || '_update_staff', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', table_name || '_delete_admin', table_name);
  END LOOP;
END $$;

-- Storage bucket and policies for project/business documents.
INSERT INTO storage.buckets (id, name, public) VALUES ('business-files', 'business-files', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "business_files_read_staff" ON storage.objects;
DROP POLICY IF EXISTS "business_files_insert_staff" ON storage.objects;
DROP POLICY IF EXISTS "business_files_delete_admin" ON storage.objects;
CREATE POLICY "business_files_read_staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'business-files' AND public.is_staff_or_admin());
CREATE POLICY "business_files_insert_staff" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-files' AND public.is_staff_or_admin());
CREATE POLICY "business_files_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-files' AND public.is_admin());

-- Reconcile legacy totals when this migration is applied to an existing database.
SELECT set_config('app.payment_rollup', 'on', true);
UPDATE public.invoices i
SET amount_paid = COALESCE((
  SELECT SUM(p.amount) FROM public.payments p
  WHERE p.invoice_id = i.id AND p.voided_at IS NULL
), 0);
UPDATE public.projects pr
SET amount_paid = COALESCE((
  SELECT SUM(p.amount) FROM public.payments p
  WHERE p.project_id = pr.id AND p.voided_at IS NULL
), 0);