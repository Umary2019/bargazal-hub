-- ====================================================================
-- Migration 0013: Prevent Duplicate Project Invoices & Reconcile Data
-- 1. Safely reconciles existing duplicate invoices (0017 -> 0016)
-- 2. Partial unique index to strictly forbid multiple active project invoices
-- 3. Hardened idempotent public.save_invoice RPC
-- 4. Hardened idempotent public.approve_service_request RPC
-- ====================================================================

-- 1. Reconcile existing duplicate invoices
-- Invoice 1: BTS-INV-2026-0016 (id: 'e83b898b-7260-44ea-8105-671af2136cfa')
-- Invoice 2: BTS-INV-2026-0017 (id: '259940e8-28f3-496c-803d-0abb1ca57b31')
DO $$
BEGIN
  -- Re-point any payments recorded against 0017 to authoritative invoice 0016
  UPDATE public.payments
  SET invoice_id = 'e83b898b-7260-44ea-8105-671af2136cfa'
  WHERE invoice_id = '259940e8-28f3-496c-803d-0abb1ca57b31';

  -- Re-point any Paystack transactions recorded against 0017 to authoritative invoice 0016
  UPDATE public.paystack_transactions
  SET invoice_id = 'e83b898b-7260-44ea-8105-671af2136cfa'
  WHERE invoice_id = '259940e8-28f3-496c-803d-0abb1ca57b31';

  -- Ensure BTS-INV-2026-0016 is marked Paid with full amount_paid
  UPDATE public.invoices
  SET amount_paid = total,
      status = 'Paid',
      updated_at = now()
  WHERE id = 'e83b898b-7260-44ea-8105-671af2136cfa';

  -- Mark BTS-INV-2026-0017 as Cancelled (reconciled duplicate superseded by 0016)
  UPDATE public.invoices
  SET status = 'Cancelled',
      amount_paid = 0,
      notes = COALESCE(notes || ' ', '') || '[Reconciled duplicate superseded by BTS-INV-2026-0016]',
      updated_at = now()
  WHERE id = '259940e8-28f3-496c-803d-0abb1ca57b31';

  -- Generic safety reconciliation: if any other project has multiple active invoices
  -- where one is Paid and the other is Draft/Sent with zero payments, cancel the unpaid one
  UPDATE public.invoices i_unpaid
  SET status = 'Cancelled',
      notes = COALESCE(i_unpaid.notes || ' ', '') || '[Duplicate invoice automatically cancelled in favor of paid invoice ' || i_paid.invoice_number || ']',
      updated_at = now()
  FROM public.invoices i_paid
  WHERE i_unpaid.project_id IS NOT NULL
    AND i_unpaid.project_id = i_paid.project_id
    AND i_unpaid.id <> i_paid.id
    AND i_paid.status = 'Paid'
    AND i_unpaid.status IN ('Draft', 'Sent')
    AND COALESCE(i_unpaid.amount_paid, 0) = 0
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p WHERE p.invoice_id = i_unpaid.id AND p.voided_at IS NULL
    );
END;
$$;

-- 2. Database Protection: Enforce that each project has AT MOST ONE active (non-cancelled) invoice
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_active_project_id_unique
  ON public.invoices (project_id)
  WHERE project_id IS NOT NULL AND status <> 'Cancelled';

-- 3. Idempotent save_invoice RPC: reuses active project invoice instead of creating duplicate
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
    -- If no invoice ID was provided, check if an active invoice already exists for this project
    IF _project_id IS NOT NULL THEN
      SELECT id INTO target_id
      FROM public.invoices
      WHERE project_id = _project_id
        AND status <> 'Cancelled'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF target_id IS NOT NULL THEN
      -- Existing active invoice found for this project: REUSE IT instead of creating a duplicate!
      UPDATE public.invoices
      SET client_id = _client_id,
          project_id = _project_id,
          issue_date = _issue_date,
          due_date = _due_date,
          discount = COALESCE(_discount, 0),
          tax = COALESCE(_tax, 0),
          status = _status,
          notes = COALESCE(_notes, notes),
          updated_at = now()
      WHERE id = target_id;

      DELETE FROM public.invoice_items WHERE invoice_id = target_id;
    ELSE
      -- Genuinely new invoice
      INSERT INTO public.invoices (
        invoice_number, client_id, project_id, issue_date, due_date,
        discount, tax, status, notes, subtotal
      )
      VALUES (
        '', _client_id, _project_id, _issue_date, _due_date,
        COALESCE(_discount, 0), COALESCE(_tax, 0), _status, _notes, 0
      )
      RETURNING id INTO target_id;
    END IF;
  ELSE
    -- Updating specified existing invoice by ID
    UPDATE public.invoices
    SET client_id = _client_id,
        project_id = _project_id,
        issue_date = _issue_date,
        due_date = _due_date,
        discount = COALESCE(_discount, 0),
        tax = COALESCE(_tax, 0),
        status = _status,
        notes = _notes,
        updated_at = now()
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

GRANT EXECUTE ON FUNCTION public.save_invoice(
  UUID, UUID, UUID, DATE, DATE, public.invoice_status,
  NUMERIC, NUMERIC, TEXT, JSONB
) TO authenticated;

-- 4. Idempotent approve_service_request RPC: protects against duplicate invoice creation
CREATE OR REPLACE FUNCTION public.approve_service_request(
  _request_id UUID,
  _assigned_staff_id UUID DEFAULT NULL,
  _admin_note TEXT DEFAULT NULL,
  _invoice_amount NUMERIC DEFAULT NULL,
  _invoice_due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.service_requests%ROWTYPE;
  v_project_id UUID;
  v_invoice_id UUID;
  v_amount NUMERIC;
  v_due_date DATE;
  v_service_name TEXT;
  v_token TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT * INTO v_request
  FROM public.service_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Service request not found';
  END IF;

  IF v_request.status <> 'Pending' THEN
    RAISE EXCEPTION 'This request has already been processed (current status: %)', v_request.status;
  END IF;

  -- Validate assigned staff member if provided
  IF _assigned_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = _assigned_staff_id
        AND ur.role = 'staff'
        AND (p.approval_status IS NULL OR p.approval_status = 'Approved')
        AND (p.is_active IS NULL OR p.is_active = true)
    ) THEN
      RAISE EXCEPTION 'Selected staff member is not valid or eligible for assignment';
    END IF;
  END IF;

  -- Determine final amount: passed override -> request budget -> service catalog price -> 0
  v_amount := COALESCE(_invoice_amount, v_request.budget, 0);
  IF v_amount <= 0 AND v_request.service_id IS NOT NULL THEN
    SELECT COALESCE(price, 0) INTO v_amount FROM public.services WHERE id = v_request.service_id;
  END IF;
  v_amount := COALESCE(v_amount, 0);

  -- Determine due date
  v_due_date := COALESCE(_invoice_due_date, v_request.preferred_deadline, (CURRENT_DATE + interval '14 days')::date);

  -- 1. Create or reuse corresponding project
  IF v_request.project_id IS NOT NULL THEN
    v_project_id := v_request.project_id;
  ELSE
    INSERT INTO public.projects (
      project_number,
      title,
      client_id,
      service_id,
      description,
      institution,
      budget,
      deadline,
      assigned_staff_id,
      status
    )
    VALUES (
      '',
      v_request.title,
      v_request.client_id,
      v_request.service_id,
      v_request.details,
      v_request.institution,
      v_amount,
      v_request.preferred_deadline,
      _assigned_staff_id,
      'Pending'
    )
    RETURNING id INTO v_project_id;
  END IF;

  -- 2. Check for duplicate invoice protection by service_request_id OR project_id
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE (service_request_id = _request_id OR (project_id = v_project_id AND status <> 'Cancelled'))
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invoice_id IS NULL THEN
    -- Look up service name for invoice item description
    IF v_request.service_id IS NOT NULL THEN
      SELECT name INTO v_service_name FROM public.services WHERE id = v_request.service_id;
    END IF;

    -- Generate Invoice
    INSERT INTO public.invoices (
      invoice_number,
      client_id,
      project_id,
      service_request_id,
      issue_date,
      due_date,
      subtotal,
      discount,
      tax,
      total,
      amount_paid,
      status,
      notes
    )
    VALUES (
      '',
      v_request.client_id,
      v_project_id,
      _request_id,
      CURRENT_DATE,
      v_due_date,
      v_amount,
      0,
      0,
      v_amount,
      0,
      'Sent',
      COALESCE(_admin_note, v_request.details)
    )
    RETURNING id INTO v_invoice_id;

    -- Add line item
    INSERT INTO public.invoice_items (
      invoice_id,
      service_id,
      description,
      quantity,
      unit_price
    )
    VALUES (
      v_invoice_id,
      v_request.service_id,
      COALESCE(v_service_name, v_request.title, 'Service Request'),
      1,
      v_amount
    );

    -- Create public token for secure client checkout
    INSERT INTO public.invoice_public_tokens (invoice_id, created_by)
    VALUES (v_invoice_id, auth.uid())
    RETURNING token INTO v_token;
  END IF;

  -- 3. Update service request status
  UPDATE public.service_requests
  SET status = 'Approved',
      project_id = v_project_id,
      approved_by = auth.uid(),
      approved_at = now(),
      processed_by = auth.uid(),
      processed_at = now(),
      admin_note = COALESCE(_admin_note, admin_note),
      updated_at = now()
  WHERE id = _request_id;

  -- 4. Audit log
  INSERT INTO public.activity_log (entity_type, entity_id, action, detail, actor_id)
  VALUES ('service_request', _request_id, 'approved', 'Approved service request: ' || v_request.title || ' and ensured active project invoice', auth.uid());

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'project_id', v_project_id,
    'invoice_id', v_invoice_id,
    'status', 'Approved',
    'approved_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_service_request(UUID, UUID, TEXT, NUMERIC, DATE) TO authenticated;
