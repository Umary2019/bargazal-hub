-- Restore the invoice save RPC for projects where the older workflow migration
-- was only partially applied or the function was removed from the schema.
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
  IF _id IS NULL THEN
    INSERT INTO public.invoices (
      invoice_number,
      client_id,
      project_id,
      issue_date,
      due_date,
      discount,
      tax,
      status,
      notes,
      subtotal
    )
    VALUES (
      '',
      _client_id,
      _project_id,
      _issue_date,
      _due_date,
      COALESCE(_discount, 0),
      COALESCE(_tax, 0),
      _status,
      _notes,
      0
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
      invoice_id,
      service_id,
      description,
      quantity,
      unit_price
    )
    VALUES (
      target_id,
      NULLIF(item->>'service_id', '')::UUID,
      item->>'description',
      COALESCE((item->>'quantity')::NUMERIC, 1),
      COALESCE((item->>'unit_price')::NUMERIC, 0)
    );
  END LOOP;

  SELECT * INTO saved_invoice
  FROM public.invoices
  WHERE id = target_id;

  RETURN saved_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_invoice(
  UUID,
  UUID,
  UUID,
  DATE,
  DATE,
  public.invoice_status,
  NUMERIC,
  NUMERIC,
  TEXT,
  JSONB
) TO authenticated;
