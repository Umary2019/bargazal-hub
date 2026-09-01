-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.pricing_type AS ENUM ('Fixed', 'Starting From', 'Hourly', 'Custom');
CREATE TYPE public.service_status AS ENUM ('Active', 'Inactive');
CREATE TYPE public.project_status AS ENUM ('Pending','Planning','Requirements','Design','Development','Testing','Client Review','Completed','Cancelled');
CREATE TYPE public.project_priority AS ENUM ('Low','Medium','High','Urgent');
CREATE TYPE public.invoice_status AS ENUM ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled');
CREATE TYPE public.payment_method AS ENUM ('Cash','Bank Transfer','POS','Online Payment','Other');

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SHARED HELPERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ BUSINESS SETTINGS ============
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Bargazal and Sons Tech Solutions',
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  logo_url TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'BTS-INV',
  currency TEXT NOT NULL DEFAULT 'NGN',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_rw" ON public.business_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  institution TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_rw" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER clients_touch BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_clients_name ON public.clients (full_name);
CREATE INDEX idx_clients_created ON public.clients (created_at DESC);

-- ============ SERVICE CATEGORIES / SERVICES ============
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_rw" ON public.service_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  pricing_type public.pricing_type NOT NULL DEFAULT 'Fixed',
  duration TEXT,
  status public.service_status NOT NULL DEFAULT 'Active',
  is_chapter BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_rw" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER services_touch BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_services_category ON public.services (category_id);

-- ============ PROJECTS ============
CREATE SEQUENCE public.project_number_seq START 1;
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT,
  requirements TEXT,
  tech_stack TEXT,
  institution TEXT,
  department TEXT,
  programme TEXT,
  supervisor TEXT,
  is_final_year BOOLEAN NOT NULL DEFAULT false,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance NUMERIC(14,2) GENERATED ALWAYS AS (GREATEST(budget - amount_paid, 0)) STORED,
  start_date DATE,
  deadline DATE,
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status public.project_status NOT NULL DEFAULT 'Pending',
  priority public.project_priority NOT NULL DEFAULT 'Medium',
  github_url TEXT,
  demo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_rw" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_projects_client ON public.projects (client_id);
CREATE INDEX idx_projects_status ON public.projects (status);

CREATE OR REPLACE FUNCTION public.set_project_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := 'BTS-PROJ-' || lpad(nextval('public.project_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER projects_number BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_project_number();

CREATE TABLE public.project_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_services TO authenticated;
GRANT ALL ON public.project_services TO service_role;
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_services_rw" ON public.project_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_project_services_project ON public.project_services (project_id);

-- ============ INVOICES ============
CREATE SEQUENCE public.invoice_number_seq START 1;
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance NUMERIC(14,2) GENERATED ALWAYS AS (GREATEST(total - amount_paid, 0)) STORED,
  status public.invoice_status NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_rw" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_invoices_client ON public.invoices (client_id);
CREATE INDEX idx_invoices_project ON public.invoices (project_id);
CREATE INDEX idx_invoices_status ON public.invoices (status);

CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'BTS-INV-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.invoice_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoices_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_rw" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id);

-- recompute invoice totals from items
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv UUID; sub NUMERIC(14,2);
BEGIN
  inv := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(total), 0) INTO sub FROM public.invoice_items WHERE invoice_id = inv;
  UPDATE public.invoices
    SET subtotal = sub,
        total = GREATEST(sub - discount + tax, 0)
  WHERE id = inv;
  RETURN NULL;
END;
$$;
CREATE TRIGGER invoice_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();

-- keep total in sync when discount/tax change
CREATE OR REPLACE FUNCTION public.sync_invoice_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.total := GREATEST(NEW.subtotal - NEW.discount + NEW.tax, 0);
  IF NEW.status NOT IN ('Draft','Cancelled') THEN
    IF NEW.amount_paid >= NEW.total AND NEW.total > 0 THEN NEW.status := 'Paid';
    ELSIF NEW.amount_paid > 0 THEN NEW.status := 'Partially Paid';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN NEW.status := 'Overdue';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoices_sync_total BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_total();

-- ============ PAYMENTS ============
CREATE SEQUENCE public.payment_number_seq START 1;
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL DEFAULT 'Cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_rw" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_payments_client ON public.payments (client_id);
CREATE INDEX idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX idx_payments_project ON public.payments (project_id);
CREATE INDEX idx_payments_date ON public.payments (payment_date DESC);

CREATE OR REPLACE FUNCTION public.set_payment_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := 'BTS-PAY-' || lpad(nextval('public.payment_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payments_number BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_payment_number();

CREATE OR REPLACE FUNCTION public.apply_payment_rollups()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv UUID; prj UUID;
BEGIN
  FOR inv IN SELECT DISTINCT x FROM unnest(ARRAY[NEW.invoice_id, OLD.invoice_id]) AS x WHERE x IS NOT NULL LOOP
    UPDATE public.invoices i
      SET amount_paid = COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.invoice_id = i.id), 0)
    WHERE i.id = inv;
  END LOOP;
  FOR prj IN SELECT DISTINCT x FROM unnest(ARRAY[NEW.project_id, OLD.project_id]) AS x WHERE x IS NOT NULL LOOP
    UPDATE public.projects pr
      SET amount_paid = COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.project_id = pr.id), 0)
    WHERE pr.id = prj;
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER payments_rollup AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_payment_rollups();

-- ============ EXPENSES ============
CREATE SEQUENCE public.expense_number_seq START 1;
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL DEFAULT 'Cash',
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_rw" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER expenses_touch BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_expenses_date ON public.expenses (expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses (category);

CREATE OR REPLACE FUNCTION public.set_expense_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
    NEW.expense_number := 'BTS-EXP-' || lpad(nextval('public.expense_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER expenses_number BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_expense_number();

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  detail TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_read" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_activity_created ON public.activity_log (created_at DESC);

-- ============ BASE CONFIGURATION DATA ============
INSERT INTO public.business_settings (business_name, phone, whatsapp, email, address, website, currency, invoice_prefix)
VALUES ('Bargazal and Sons Tech Solutions', '', '', '', '', '', 'NGN', 'BTS-INV');

INSERT INTO public.service_categories (name, slug, description, sort_order) VALUES
 ('Final Year Projects', 'final-year-projects', 'Academic final year project services', 1),
 ('Software Development', 'software-development', 'Custom software and application development', 2),
 ('Design', 'design', 'Product, brand and interface design', 3),
 ('IT Services', 'it-services', 'Consulting, networking and technical support', 4),
 ('Training', 'training', 'Technology and programming training', 5);

INSERT INTO public.services (category_id, name, price, pricing_type, is_chapter, sort_order)
SELECT c.id, s.name, s.price, s.ptype::public.pricing_type, s.chapter, s.ord
FROM public.service_categories c
JOIN (VALUES
 ('final-year-projects','Project Topics', 5000, 'Fixed', false, 1),
 ('final-year-projects','Chapter One — Introduction', 15000, 'Fixed', true, 2),
 ('final-year-projects','Chapter Two — Literature Review', 20000, 'Fixed', true, 3),
 ('final-year-projects','Chapter Three — Methodology', 20000, 'Fixed', true, 4),
 ('final-year-projects','Chapter Four — System Analysis and Design', 25000, 'Fixed', true, 5),
 ('final-year-projects','Chapter Five — Implementation, Testing and Conclusion', 20000, 'Fixed', true, 6),
 ('final-year-projects','Complete Documentation', 90000, 'Starting From', false, 7),
 ('final-year-projects','Project Software', 150000, 'Starting From', false, 8),
 ('final-year-projects','System Analysis', 25000, 'Fixed', false, 9),
 ('final-year-projects','System Design', 25000, 'Fixed', false, 10),
 ('final-year-projects','UML Diagrams', 15000, 'Fixed', false, 11),
 ('final-year-projects','ER Diagrams', 10000, 'Fixed', false, 12),
 ('final-year-projects','Flowcharts', 10000, 'Fixed', false, 13),
 ('final-year-projects','Use Case Diagrams', 10000, 'Fixed', false, 14),
 ('final-year-projects','Class Diagrams', 10000, 'Fixed', false, 15),
 ('final-year-projects','Sequence Diagrams', 10000, 'Fixed', false, 16),
 ('final-year-projects','Presentation Slides', 15000, 'Fixed', false, 17),
 ('final-year-projects','Project Corrections', 10000, 'Starting From', false, 18),
 ('final-year-projects','Project Support', 10000, 'Custom', false, 19),
 ('software-development','Web Application Development', 350000, 'Starting From', false, 1),
 ('software-development','Mobile Application Development', 500000, 'Starting From', false, 2),
 ('software-development','Desktop Application Development', 300000, 'Starting From', false, 3),
 ('software-development','Custom Business Software', 600000, 'Starting From', false, 4),
 ('software-development','API Development', 200000, 'Starting From', false, 5),
 ('software-development','Database Development', 150000, 'Starting From', false, 6),
 ('design','UI/UX Design', 150000, 'Starting From', false, 1),
 ('design','Logo Design', 40000, 'Fixed', false, 2),
 ('design','Branding', 120000, 'Starting From', false, 3),
 ('it-services','IT Consulting', 25000, 'Hourly', false, 1),
 ('it-services','Computer Services', 15000, 'Starting From', false, 2),
 ('it-services','Networking', 100000, 'Starting From', false, 3),
 ('it-services','Technical Support', 20000, 'Hourly', false, 4),
 ('training','Programming Training', 80000, 'Fixed', false, 1),
 ('training','Web Development Training', 100000, 'Fixed', false, 2),
 ('training','Computer Training', 50000, 'Fixed', false, 3),
 ('training','Software Training', 60000, 'Fixed', false, 4)
) AS s(slug, name, price, ptype, chapter, ord) ON s.slug = c.slug;
