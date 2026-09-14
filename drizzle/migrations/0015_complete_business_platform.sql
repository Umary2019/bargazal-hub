-- Migration 0015: Complete Business Platform Schema, Workflows, Refunds, Installments, Reminders, and CRM
-- Date: 2026-09-14

-- 1. ENHANCE CLIENTS TABLE
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' NOT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(50) DEFAULT 'Website',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. ENHANCE PROFILES TABLE (STAFF & USERS)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
  ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

-- 3. ENHANCE SERVICE CATEGORIES TABLE
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 4. ENHANCE PROJECT TASKS TABLE
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium' NOT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. ENHANCE PROJECT MILESTONES TABLE
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 6. ENHANCE PROJECT FILES TABLE
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_deliverable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- 7. ENHANCE EXPENSES TABLE
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'Approved' NOT NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 8. ENHANCE INVOICES TABLE
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- 9. ENHANCE NOTIFICATIONS TABLE
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS related_entity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS related_entity_id UUID;

-- 10. CREATE INVOICE INSTALLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'Pending' NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_installment_status CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_installments_invoice_id ON public.invoice_installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_installments_status ON public.invoice_installments(status);

-- 11. CREATE REFUNDS TABLE
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Completed' NOT NULL,
  gateway_refund_id TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_refund_status CHECK (status IN ('Pending', 'Completed', 'Failed'))
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_invoice_id ON public.refunds(invoice_id);

-- 12. CREATE INVOICE REMINDER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) DEFAULT 'in_app' NOT NULL,
  status VARCHAR(20) DEFAULT 'Sent' NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminder_logs_invoice ON public.invoice_reminder_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminder_logs_type ON public.invoice_reminder_logs(invoice_id, reminder_type);

-- 13. CREATE EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'Sent' NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);

-- 14. ENHANCE ACTIVITY LOG
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 15. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_staff_id ON public.projects(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_reference ON public.paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_status ON public.paystack_transactions(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);

-- 16. ROW LEVEL SECURITY (RLS) FOR NEW TABLES

ALTER TABLE public.invoice_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Installments: Admin/Staff full access, Clients can view their own
DROP POLICY IF EXISTS "Admin and staff full access to installments" ON public.invoice_installments;
CREATE POLICY "Admin and staff full access to installments" ON public.invoice_installments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Clients can view own invoice installments" ON public.invoice_installments;
CREATE POLICY "Clients can view own invoice installments" ON public.invoice_installments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
      WHERE i.id = invoice_installments.invoice_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- Refunds: Admin full access, Clients can view own refunds
DROP POLICY IF EXISTS "Admin full access to refunds" ON public.refunds;
CREATE POLICY "Admin full access to refunds" ON public.refunds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Staff can view refunds" ON public.refunds;
CREATE POLICY "Staff can view refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Clients can view own refunds" ON public.refunds;
CREATE POLICY "Clients can view own refunds" ON public.refunds
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
      WHERE i.id = refunds.invoice_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- Reminder logs: Admin/Staff can view
DROP POLICY IF EXISTS "Admin and staff access to reminder logs" ON public.invoice_reminder_logs;
CREATE POLICY "Admin and staff access to reminder logs" ON public.invoice_reminder_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Email logs: Admin can view
DROP POLICY IF EXISTS "Admin access to email logs" ON public.email_logs;
CREATE POLICY "Admin access to email logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 17. SECURE FUNCTIONS & RPCS

-- A. Idempotent Notification Generator
CREATE OR REPLACE FUNCTION public.create_notification_safe(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _link TEXT DEFAULT NULL,
  _priority TEXT DEFAULT 'Normal',
  _related_entity TEXT DEFAULT NULL,
  _related_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_id UUID;
  v_recent_count INT;
BEGIN
  -- Deduplicate identical notification sent within 30 minutes
  SELECT COUNT(*) INTO v_recent_count
  FROM public.notifications
  WHERE user_id = _user_id
    AND title = _title
    AND created_at > NOW() - INTERVAL '30 minutes';

  IF v_recent_count > 0 THEN
    SELECT id INTO v_notif_id
    FROM public.notifications
    WHERE user_id = _user_id AND title = _title
    ORDER BY created_at DESC LIMIT 1;
    RETURN v_notif_id;
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, link, priority, related_entity, related_entity_id, is_read, created_at
  ) VALUES (
    _user_id, _title, _message, _type, _link, _priority, _related_entity, _related_entity_id, FALSE, NOW()
  ) RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

-- B. Overdue Invoice Checker & Reminder Engine
CREATE OR REPLACE FUNCTION public.check_and_mark_overdue_invoices()
RETURNS TABLE (
  updated_count INT,
  notified_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT := 0;
  v_notified INT := 0;
  r RECORD;
  v_admin RECORD;
BEGIN
  -- Mark unpaid or partially paid invoices whose due_date < CURRENT_DATE as Overdue
  FOR r IN
    SELECT i.id, i.invoice_number, i.total, i.balance, i.client_id, i.due_date, c.auth_user_id, c.full_name
    FROM public.invoices i
    JOIN public.clients c ON c.id = i.client_id
    WHERE i.status NOT IN ('Paid', 'Cancelled')
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_DATE
      AND COALESCE(i.balance, i.total - COALESCE(i.amount_paid, 0)) > 0
  LOOP
    -- Update invoice status to Overdue if not already marked
    UPDATE public.invoices
    SET status = 'Overdue', updated_at = NOW()
    WHERE id = r.id AND status != 'Overdue';

    IF FOUND THEN
      v_updated := v_updated + 1;
    END IF;

    -- Send in-app notification to client if not already sent today
    IF r.auth_user_id IS NOT NULL THEN
      PERFORM public.create_notification_safe(
        r.auth_user_id,
        'Invoice Overdue: ' || r.invoice_number,
        'Your invoice ' || r.invoice_number || ' was due on ' || to_char(r.due_date, 'YYYY-MM-DD') || '. Outstanding balance: ₦' || ROUND(r.balance, 2) || '. Please settle at your earliest convenience.',
        'invoice',
        '/dashboard',
        'High',
        'invoice',
        r.id
      );
      v_notified := v_notified + 1;
    END IF;

    -- Record in reminder logs
    INSERT INTO public.invoice_reminder_logs (
      invoice_id, reminder_type, channel, status, recipient, sent_at
    ) VALUES (
      r.id, 'overdue_check', 'in_app', 'Sent', COALESCE(r.full_name, 'Client'), NOW()
    );
  END LOOP;

  RETURN QUERY SELECT v_updated, v_notified;
END;
$$;

-- C. Process Payment Refund RPC
CREATE OR REPLACE FUNCTION public.process_payment_refund(
  _payment_id UUID,
  _amount NUMERIC,
  _reason TEXT,
  _gateway_refund_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_invoice RECORD;
  v_existing_refunds NUMERIC;
  v_refundable NUMERIC;
  v_new_amount_paid NUMERIC;
  v_new_balance NUMERIC;
  v_new_invoice_status TEXT;
  v_refund_id UUID;
  v_admin_id UUID := auth.uid();
  v_client RECORD;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can process refunds';
  END IF;

  -- Load payment
  SELECT * INTO v_payment FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;

  -- Load invoice
  SELECT * INTO v_invoice FROM public.invoices WHERE id = v_payment.invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked invoice not found';
  END IF;

  -- Check existing refunds
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_refunds
  FROM public.refunds
  WHERE payment_id = _payment_id AND status = 'Completed';

  v_refundable := v_payment.amount - v_existing_refunds;
  IF _amount <= 0 OR _amount > v_refundable THEN
    RAISE EXCEPTION 'Invalid refund amount. Maximum refundable: %', v_refundable;
  END IF;

  -- Insert refund record
  INSERT INTO public.refunds (
    payment_id, invoice_id, amount, reason, status, gateway_refund_id, processed_by, created_at
  ) VALUES (
    _payment_id, v_invoice.id, _amount, _reason, 'Completed', _gateway_refund_id, v_admin_id, NOW()
  ) RETURNING id INTO v_refund_id;

  -- Recalculate invoice financial state
  v_new_amount_paid := GREATEST(0, COALESCE(v_invoice.amount_paid, 0) - _amount);
  v_new_balance := GREATEST(0, v_invoice.total - v_new_amount_paid);

  IF v_new_amount_paid = 0 THEN
    v_new_invoice_status := 'Sent';
  ELSIF v_new_balance > 0 THEN
    v_new_invoice_status := 'Partially Paid';
  ELSE
    v_new_invoice_status := 'Paid';
  END IF;

  UPDATE public.invoices
  SET amount_paid = v_new_amount_paid,
      balance = v_new_balance,
      status = v_new_invoice_status,
      updated_at = NOW()
  WHERE id = v_invoice.id;

  -- Update payment record status/notes
  UPDATE public.payments
  SET notes = COALESCE(notes, '') || ' [Refunded: ₦' || ROUND(_amount, 2) || ' on ' || to_char(NOW(), 'YYYY-MM-DD') || ' Reason: ' || _reason || ']'
  WHERE id = _payment_id;

  -- Audit log
  INSERT INTO public.activity_log (
    actor_id, action, entity_type, entity_id, detail, metadata, created_at
  ) VALUES (
    v_admin_id, 'refund_processed', 'payment', _payment_id,
    'Processed refund of ₦' || ROUND(_amount, 2) || ' for invoice ' || v_invoice.invoice_number,
    jsonb_build_object(
      'refund_id', v_refund_id,
      'amount', _amount,
      'invoice_id', v_invoice.id,
      'reason', _reason,
      'gateway_refund_id', _gateway_refund_id
    ),
    NOW()
  );

  -- Notify client
  SELECT c.auth_user_id, c.full_name INTO v_client
  FROM public.clients c WHERE c.id = v_invoice.client_id;

  IF v_client.auth_user_id IS NOT NULL THEN
    PERFORM public.create_notification_safe(
      v_client.auth_user_id,
      'Payment Refund Issued',
      'A refund of ₦' || ROUND(_amount, 2) || ' has been processed for invoice ' || v_invoice.invoice_number || '. Reason: ' || _reason,
      'payment',
      '/dashboard',
      'High',
      'refund',
      v_refund_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'new_amount_paid', v_new_amount_paid,
    'new_balance', v_new_balance,
    'invoice_status', v_new_invoice_status
  );
END;
$$;

-- D. Reconcile Transaction RPC
CREATE OR REPLACE FUNCTION public.reconcile_transaction(
  _transaction_id UUID,
  _invoice_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
  v_res JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can manually reconcile transactions';
  END IF;

  SELECT * INTO v_tx FROM public.paystack_transactions WHERE id = _transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paystack transaction record not found';
  END IF;

  -- Associate transaction with invoice
  UPDATE public.paystack_transactions
  SET invoice_id = _invoice_id
  WHERE id = _transaction_id;

  -- Trigger settlement logic
  v_res := public.settle_paystack_payment(
    v_tx.reference,
    _invoice_id,
    COALESCE(v_tx.amount_kobo / 100.0, 0),
    'Manual Admin Reconciliation'
  );

  -- Log audit event
  INSERT INTO public.activity_log (
    actor_id, action, entity_type, entity_id, detail, metadata, created_at
  ) VALUES (
    v_admin_id, 'manual_reconciliation', 'paystack_transaction', _transaction_id,
    'Manually reconciled transaction ' || v_tx.reference || ' with invoice',
    jsonb_build_object(
      'transaction_id', _transaction_id,
      'invoice_id', _invoice_id,
      'notes', _notes,
      'settlement_result', v_res
    ),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'settlement', v_res);
END;
$$;

-- E. Audit Event Logger RPC
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _detail TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_actor_id UUID := auth.uid();
BEGIN
  INSERT INTO public.activity_log (
    actor_id, action, entity_type, entity_id, detail, metadata, created_at
  ) VALUES (
    v_actor_id, _action, _entity_type, _entity_id, _detail, _metadata, NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
