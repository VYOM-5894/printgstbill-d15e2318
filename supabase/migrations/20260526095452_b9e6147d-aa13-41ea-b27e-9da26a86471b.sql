create or replace function public.next_invoice_number()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prefix text;
  v_number int;
begin
  update public.company_settings
  set next_invoice_number = next_invoice_number + 1
  where id = (select id from public.company_settings limit 1)
  returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_number;
  return coalesce(v_prefix,'INV') || '-' || lpad(v_number::text, 5, '0');
end;
$$;