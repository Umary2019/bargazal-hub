-- Migration 0011: Service Requests Invoicing & Paystack Payments

-- 1. Add service_request_id to invoices for end-to-end traceability
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL;

-- Unique constraint ensuring one approved service request generates at most one invoice (Requirement 16)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_service_request_id_unique
  ON public.invoices (service_request_id)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_service_request_id
  ON public.invoices (service_request_id);

-- 2. Add payment channel & currency fields to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS provider_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_idx
  ON public.payments (provider_reference)
  WHERE provider_reference IS NOT NULL;

-- 3. Allow clients to read public tokens for their own invoices
DROP POLICY IF EXISTS "invoice_tokens_client_read" ON public.invoice_public_tokens;
CREATE POLICY "invoice_tokens_client_read" ON public.invoice_public_tokens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND i.client_id = public.current_client_id()
      AND public.is_approved_client()
  ));

-- 4. Helper function to retrieve or generate a secure public invoice token for payment
CREATE OR REPLACE FUNCTION public.get_or_create_invoice_token(_invoice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_client_id UUID;
BEGIN
  -- Verify access: staff/admin OR client who owns this invoice
  SELECT client_id INTO v_client_id FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF NOT (public.is_staff_or_admin() OR (v_client_id = public.current_client_id() AND public.is_approved_client())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT token INTO v_token
  FROM public.invoice_public_tokens
  WHERE invoice_id = _invoice_id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_token IS NULL THEN
    INSERT INTO public.invoice_public_tokens (invoice_id, created_by)
    VALUES (_invoice_id, auth.uid())
    RETURNING token INTO v_token;
  END IF;

  RETURN v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_invoice_token(UUID) TO authenticated;

-- 5. Updated approve_service_request RPC with automatic invoice generation and custom pricing
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

  -- 1. Create corresponding project
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

  -- 2. Check for duplicate invoice protection (Requirement 16)
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE service_request_id = _request_id
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
  VALUES ('service_request', _request_id, 'approved', 'Approved service request: ' || v_request.title || ' and generated invoice', auth.uid());

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'project_id', v_project_id,
    'invoice_id', v_invoice_id,
    'amount', v_amount,
    'status', 'Approved',
    'approved_at', now()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_service_request(UUID, UUID, TEXT, NUMERIC, DATE) TO authenticated;

-- 6. Updated record_paystack_success with complete audit and project rollups
CREATE OR REPLACE FUNCTION public.record_paystack_success(
  _reference TEXT,
  _amount NUMERIC,
  _paid_at TIMESTAMPTZ,
  _channel TEXT,
  _raw JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.paystack_transactions%ROWTYPE;
  new_payment public.payments%ROWTYPE;
  v_project_id UUID;
BEGIN
  SELECT * INTO tx FROM public.paystack_transactions WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_reference');
  END IF;

  IF tx.status = 'success' THEN
    RETURN jsonb_build_object('ok', true, 'already_recorded', true, 'invoice_id', tx.invoice_id);
  END IF;

  -- Retrieve linked project_id
  SELECT project_id INTO v_project_id FROM public.invoices WHERE id = tx.invoice_id;

  INSERT INTO public.payments (
    client_id,
    invoice_id,
    project_id,
    amount,
    payment_method,
    payment_date,
    reference,
    provider_reference,
    channel,
    currency,
    notes,
    payment_number
  )
  VALUES (
    COALESCE(tx.client_id, (SELECT client_id FROM public.invoices WHERE id = tx.invoice_id)),
    tx.invoice_id,
    v_project_id,
    COALESCE(_amount, tx.amount),
    'Online Payment',
    COALESCE(_paid_at, now())::DATE,
    _reference,
    _reference,
    _channel,
    'NGN',
    'Paystack ' || COALESCE(_channel, 'online'),
    ''
  )
  RETURNING * INTO new_payment;

  UPDATE public.paystack_transactions
     SET status = 'success',
         paid_at = COALESCE(_paid_at, now()),
         channel = _channel,
         raw = _raw,
         payment_id = new_payment.id
   WHERE id = tx.id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_recorded', false,
    'invoice_id', tx.invoice_id,
    'payment_id', new_payment.id,
    'amount', COALESCE(_amount, tx.amount)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_paystack_success(TEXT, NUMERIC, TIMESTAMPTZ, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_paystack_success(TEXT, NUMERIC, TIMESTAMPTZ, TEXT, JSONB) TO service_role;
