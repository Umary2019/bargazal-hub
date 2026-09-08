-- Paystack online payments for invoices
CREATE TABLE IF NOT EXISTS public.paystack_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned')),
  authorization_url TEXT,
  channel TEXT,
  paid_at TIMESTAMPTZ,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paystack_transactions TO authenticated;
GRANT ALL ON public.paystack_transactions TO service_role;

ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paystack_tx_staff_read" ON public.paystack_transactions;
CREATE POLICY "paystack_tx_staff_read" ON public.paystack_transactions
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR client_id = public.current_client_id());

CREATE INDEX IF NOT EXISTS idx_paystack_tx_invoice ON public.paystack_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_paystack_tx_status ON public.paystack_transactions (status);

CREATE OR REPLACE FUNCTION public.paystack_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS paystack_tx_updated_at ON public.paystack_transactions;
CREATE TRIGGER paystack_tx_updated_at BEFORE UPDATE ON public.paystack_transactions
  FOR EACH ROW EXECUTE FUNCTION public.paystack_touch_updated_at();

-- Idempotently converts a verified Paystack charge into a payment row.
CREATE OR REPLACE FUNCTION public.record_paystack_success(
  _reference TEXT,
  _amount NUMERIC,
  _paid_at TIMESTAMPTZ,
  _channel TEXT,
  _raw JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx public.paystack_transactions%ROWTYPE; new_payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO tx FROM public.paystack_transactions WHERE reference = _reference FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_reference');
  END IF;
  IF tx.status = 'success' THEN
    RETURN jsonb_build_object('ok', true, 'already_recorded', true, 'invoice_id', tx.invoice_id);
  END IF;

  INSERT INTO public.payments (client_id, invoice_id, amount, payment_method, payment_date, reference, notes, payment_number)
  VALUES (
    COALESCE(tx.client_id, (SELECT client_id FROM public.invoices WHERE id = tx.invoice_id)),
    tx.invoice_id,
    COALESCE(_amount, tx.amount),
    'Online Payment',
    COALESCE(_paid_at, now())::DATE,
    _reference,
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

  RETURN jsonb_build_object('ok', true, 'already_recorded', false, 'invoice_id', tx.invoice_id, 'payment_id', new_payment.id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_paystack_success(TEXT, NUMERIC, TIMESTAMPTZ, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_paystack_success(TEXT, NUMERIC, TIMESTAMPTZ, TEXT, JSONB) TO service_role;

-- Marks a non-successful outcome without touching balances.
CREATE OR REPLACE FUNCTION public.mark_paystack_failed(_reference TEXT, _status TEXT, _raw JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.paystack_transactions
     SET status = CASE WHEN _status IN ('failed','abandoned') THEN _status ELSE 'failed' END,
         raw = _raw
   WHERE reference = _reference AND status <> 'success';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_paystack_failed(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_paystack_failed(TEXT, TEXT, JSONB) TO service_role;
