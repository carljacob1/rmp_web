-- Run this SQL in Supabase SQL editor
-- Mirrors local IndexedDB stores: users, currentUser (skip), registrations, appointments, services,
-- medicines, invoices, expenses, categories, orders, products, settings

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Helper: common timestamp defaults
-- Note: updated_at will be set automatically via triggers defined below

-- categories
create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text,
  sortOrder integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products (MenuItem), with JSONB arrays
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text,
  price numeric not null,
  category text references public.categories(id) on delete set null,
  image text,
  available boolean not null default true,
  modifiers jsonb not null default '[]'::jsonb,
  variations jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  expiryDate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- orders, with items array
create table if not exists public.orders (
  id text primary key,
  customerName text,
  customerPhone text,
  items jsonb not null default '[]'::jsonb, -- [{name,quantity,price}]
  total numeric not null default 0,
  orderTime timestamptz not null default now(),
  status text not null check (status in ('pending','preparing','ready','completed','cancelled')),
  orderType text not null check (orderType in ('dine-in','takeout','delivery')),
  tableNumber text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- medicines (pharmacy InventoryTracker)
create table if not exists public.medicines (
  id text primary key,
  name text not null,
  brand text,
  category text,
  batchNumber text,
  expiryDate date,
  manufacturingDate date,
  quantity integer not null default 0,
  unitPrice numeric not null default 0,
  supplier text,
  prescription boolean not null default false,
  activeIngredient text,
  dosage text,
  form text check (form in ('tablet','capsule','syrup','injection','cream','drops')),
  lowStockThreshold integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- users (from registration)
create table if not exists public.users (
  id text primary key,
  businessId text not null,
  ownerName text,
  email text,
  mobile text,
  password text, -- consider hashing if used server-side
  businessType text,
  originalBusinessType text,
  plan text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- registrations (stored during onboarding)
create table if not exists public.registrations (
  id text primary key,
  ownerName text,
  email text,
  mobile text,
  password text,
  businessType text,
  plan text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- settings (generic key/value)
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoices (accounting)
create table if not exists public.invoices (
  id text primary key,
  invoiceNumber text not null,
  clientName text not null,
  clientEmail text,
  clientAddress text,
  items jsonb not null default '[]'::jsonb, -- [{id,description,quantity,rate,amount}]
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  status text not null check (status in ('draft','sent','paid','overdue')),
  issueDate date not null,
  dueDate date not null,
  notes text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- expenses (accounting)
create table if not exists public.expenses (
  id text primary key,
  description text not null,
  amount numeric not null,
  category text not null,
  date date not null,
  receipt text,
  notes text,
  createdAt timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: appointments, services (skeletons if needed later)
create table if not exists public.appointments (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key,
  name text,
  description text,
  price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to maintain updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' and tablename in (
      'categories','products','orders','medicines','users','registrations','settings','invoices','expenses','appointments','services'
    )
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t.tablename, t.tablename);
  end loop;
end $$;

-- Realtime: enable publication for these tables (UI: Database -> Replication)
-- For SQL-based enabling:
-- create publication supabase_realtime for table 
--   public.categories, public.products, public.orders, public.medicines,
--   public.users, public.registrations, public.settings, public.invoices, public.expenses;

-- RLS: keep enabled; add simple permissive policies for now (adjust as needed)
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.medicines enable row level security;
alter table public.users enable row level security;
alter table public.registrations enable row level security;
alter table public.settings enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.appointments enable row level security;
alter table public.services enable row level security;

create policy "public read" on public.categories for select using (true);
create policy "public write" on public.categories for insert with check (true);
create policy "public update" on public.categories for update using (true);
create policy "public delete" on public.categories for delete using (true);

create policy "public read" on public.products for select using (true);
create policy "public write" on public.products for insert with check (true);
create policy "public update" on public.products for update using (true);
create policy "public delete" on public.products for delete using (true);

create policy "public read" on public.orders for select using (true);
create policy "public write" on public.orders for insert with check (true);
create policy "public update" on public.orders for update using (true);
create policy "public delete" on public.orders for delete using (true);

create policy "public read" on public.medicines for select using (true);
create policy "public write" on public.medicines for insert with check (true);
create policy "public update" on public.medicines for update using (true);
create policy "public delete" on public.medicines for delete using (true);

create policy "public read" on public.users for select using (true);
create policy "public write" on public.users for insert with check (true);
create policy "public update" on public.users for update using (true);

create policy "public read" on public.registrations for select using (true);
create policy "public write" on public.registrations for insert with check (true);
create policy "public update" on public.registrations for update using (true);

create policy "public read" on public.settings for select using (true);
create policy "public write" on public.settings for insert with check (true);
create policy "public update" on public.settings for update using (true);

create policy "public read" on public.invoices for select using (true);
create policy "public write" on public.invoices for insert with check (true);
create policy "public update" on public.invoices for update using (true);
create policy "public delete" on public.invoices for delete using (true);

create policy "public read" on public.expenses for select using (true);
create policy "public write" on public.expenses for insert with check (true);
create policy "public update" on public.expenses for update using (true);
create policy "public delete" on public.expenses for delete using (true);


