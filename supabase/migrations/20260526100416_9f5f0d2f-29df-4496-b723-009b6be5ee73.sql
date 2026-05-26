
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  reference text DEFAULT '',
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all" ON public.payments;
CREATE POLICY "public all" ON public.payments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

CREATE OR REPLACE FUNCTION public.recalc_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice uuid;
  v_total numeric;
  v_paid numeric;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total INTO v_total FROM public.invoices WHERE id = v_invoice;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice;
  UPDATE public.invoices
    SET paid_amount = v_paid,
        payment_status = CASE
          WHEN v_paid <= 0 THEN 'unpaid'
          WHEN v_paid < v_total THEN 'partial'
          ELSE 'paid'
        END
    WHERE id = v_invoice;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_recalc ON public.payments;
CREATE TRIGGER trg_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_payment();
