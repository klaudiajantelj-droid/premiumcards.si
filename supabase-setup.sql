-- ============================================================
-- premiumcards.si — order intake backend
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- 1. orders ----------
create table orders (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,           -- client-generated, prevents duplicate submissions
  created_at timestamptz not null default now(),

  name text not null,
  company text,
  email text not null,
  phone text,
  vat_id text,
  previous_order_number text,

  billing_address text not null,
  billing_postcode text not null,
  billing_city text not null,
  billing_country text not null,

  shipping_same_as_billing boolean not null default true,
  shipping_address text,
  shipping_postcode text,
  shipping_city text,
  shipping_country text,

  message text,

  order_type text not null check (order_type in ('first','repeat')),
  design_service text not null default 'have-artwork'
    check (design_service in ('have-artwork','logo-to-card','redesign','new-logo')),
  people int not null default 1 check (people between 1 and 20),

  -- only used when design_service = 'new-logo' (replaces a file upload
  -- with a short design brief instead)
  brief_company_name text,
  brief_industry text,
  brief_style text,

  -- The client sends its own computed total for display/debugging only.
  -- order_total_server is the number the SERVER computed independently —
  -- this is the one that should ever be treated as authoritative.
  client_total numeric(10,2),
  order_total_server numeric(10,2) not null,

  -- VAT_MODE snapshot at order time (see SELLER_CONFIG in index.html and
  -- the matching constant in the Edge Function). While VAT_MODE is
  -- 'exempt', vat_amount is always 0 and gross_total_server = order_total_server.
  vat_mode text not null default 'exempt' check (vat_mode in ('exempt','registered')),
  vat_amount numeric(10,2) not null default 0,
  gross_total_server numeric(10,2) not null,

  status text not null default 'new' check (status in ('new','quoted','confirmed','in_production','shipped','cancelled'))
);

-- ---------- 2. order_people (per-person personalization data) ----------
create table order_people (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  position int not null,           -- 1-based index within the order
  name text,
  role text,
  email text,
  phone text
);

-- ---------- 3. order_files (metadata only — actual bytes live in Storage) ----------
create table order_files (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  kind text not null check (kind in ('pdf','logo','existing_card','extra')),
  storage_path text not null,      -- path inside the private 'order-uploads' bucket
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- ---------- 4. private storage bucket for uploads ----------
-- Run in Supabase Dashboard → Storage → Create bucket "order-uploads", Private.
-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('order-uploads', 'order-uploads', false)
on conflict (id) do nothing;

-- Storage RLS: allow anon to INSERT (upload) only into a path prefixed
-- with their own request_id (passed as the first path segment), never
-- to read/list/overwrite other people's files.
create policy "anon can upload to their own request_id folder"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'order-uploads'
    and (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'request_id'
  );
-- NOTE: the policy above requires passing the request_id via a signed
-- context, which plain anon calls do not have. The simplest *practical*
-- approach for this project size is to upload from the Edge Function
-- (service role, server-side) instead of directly from the browser —
-- see /supabase/functions/submit-order/index.ts. If you later want true
-- direct-from-browser uploads, replace this policy with one that checks
-- a per-request signed upload URL (Supabase "createSignedUploadUrl").

-- No public select/list policy on storage.objects for 'order-uploads' —
-- files are private by default; only the service role (Edge Function /
-- dashboard) can read them.

-- ---------- 5. RLS: lock all customer-data tables down ----------
alter table orders enable row level security;
alter table order_people enable row level security;
alter table order_files enable row level security;

-- No select/insert/update/delete policies for anon on any of the three
-- tables above. The ONLY way in is through the submit-order Edge
-- Function, which uses the service role key server-side and therefore
-- bypasses RLS. The browser never gets read access to order data.

-- ============================================================
-- Legacy note: earlier versions of this project used a `print_runs` /
-- `filled_slots` capacity-tracking table and a public `submit_order()`
-- RPC callable directly from the browser. Both are intentionally
-- REMOVED in this version:
--  - capacity tracking is gone (no shared production-run mechanic is
--    exposed publicly — see project confidentiality requirements)
--  - price calculation and order insertion now happen server-side in
--    the submit-order Edge Function, not in a browser-callable RPC,
--    so the client-submitted total can never be trusted or stored
--    as authoritative.
-- If you are migrating from that version, drop the old objects first:
--   drop function if exists submit_order(text,text,text,text,text,text,text,text,text,text,int,numeric);
--   drop table if exists print_runs cascade;
-- ============================================================

-- ---------- 6. helpful views for you, the operator ----------
-- Full order with people, for the Table Editor / SQL:
--   select o.*, p.*
--   from orders o left join order_people p on p.order_id = o.id
--   order by o.created_at desc;

-- ============================================================
-- MIGRATION — only needed if you already ran an earlier version of
-- this exact schema (i.e. you have an `orders` table but it's missing
-- the columns below). Safe to skip entirely on a brand-new project,
-- since the CREATE TABLE above already includes everything.
-- ============================================================
-- alter table orders add column if not exists brief_company_name text;
-- alter table orders add column if not exists brief_industry text;
-- alter table orders add column if not exists brief_style text;
-- alter table orders add column if not exists vat_mode text not null default 'exempt';
-- alter table orders add column if not exists vat_amount numeric(10,2) not null default 0;
-- alter table orders add column if not exists gross_total_server numeric(10,2);
-- update orders set gross_total_server = order_total_server where gross_total_server is null;
-- alter table orders alter column gross_total_server set not null;
