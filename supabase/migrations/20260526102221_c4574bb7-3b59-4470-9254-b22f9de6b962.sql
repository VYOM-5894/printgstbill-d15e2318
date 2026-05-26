
-- Tighten RLS: only authenticated users can access business data
DROP POLICY IF EXISTS "public all" ON public.company_settings;
DROP POLICY IF EXISTS "public all" ON public.customers;
DROP POLICY IF EXISTS "public all" ON public.products;
DROP POLICY IF EXISTS "public all" ON public.invoices;
DROP POLICY IF EXISTS "public all" ON public.invoice_items;
DROP POLICY IF EXISTS "public all" ON public.payments;

CREATE POLICY "authenticated all" ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
