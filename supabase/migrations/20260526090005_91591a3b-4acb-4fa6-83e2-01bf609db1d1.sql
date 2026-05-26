
create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Company',
  gstin text default '',
  state text default '',
  address text default '',
  mobile text default '',
  email text default '',
  logo_url text default '',
  bank_name text default '',
  bank_account text default '',
  bank_ifsc text default '',
  invoice_prefix text default 'INV',
  next_invoice_number int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_settings (name) values ('My Company');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text default '',
  mobile text default '',
  address text default '',
  state text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hsn text default '',
  gst_rate numeric not null default 18,
  unit_price numeric not null default 0,
  unit text default 'NOS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  invoice_date date not null default current_date,
  customer_id uuid references public.customers(id) on delete set null,
  customer_snapshot jsonb not null,
  company_snapshot jsonb not null,
  is_igst boolean not null default false,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  taxable_amount numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  total numeric not null default 0,
  amount_in_words text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create index on public.invoices (invoice_date desc);
create index on public.invoices (customer_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  hsn text default '',
  quantity numeric not null default 1,
  unit text default 'NOS',
  rate numeric not null default 0,
  gst_rate numeric not null default 0,
  amount numeric not null default 0,
  position int not null default 0
);

create index on public.invoice_items (invoice_id);

alter table public.company_settings enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- Open access policies (single-business internal tool)
create policy "public all" on public.company_settings for all using (true) with check (true);
create policy "public all" on public.customers for all using (true) with check (true);
create policy "public all" on public.products for all using (true) with check (true);
create policy "public all" on public.invoices for all using (true) with check (true);
create policy "public all" on public.invoice_items for all using (true) with check (true);

-- Atomic invoice number generator
create or replace function public.next_invoice_number()
returns text
language plpgsql
as $$
declare
  rec record;
  num int;
  result text;
begin
  update public.company_settings
  set next_invoice_number = next_invoice_number + 1
  where id = (select id from public.company_settings limit 1)
  returning invoice_prefix, next_invoice_number - 1 into rec;
  result := coalesce(rec.invoice_prefix,'INV') || '-' || lpad(rec.next_invoice_number::text, 5, '0');
  return result;
end;
$$;
