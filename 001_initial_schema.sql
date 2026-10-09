-- Sefizlumia initial schema
-- Apply using Supabase SQL Editor or Supabase CLI.
-- IMPORTANT: Review all policies before using with real patient data.

create extension if not exists pgcrypto;

create type public.app_role as enum ('patient', 'pharmacist', 'admin');
create type public.consultation_status as enum ('queued', 'assigned', 'active', 'closed', 'rejected');
create type public.order_status as enum ('pending', 'review_required', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Lainnya',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  description text not null default '',
  composition text,
  indication text,
  directions text,
  warnings text,
  storage text,
  classification text not null default 'Perlu konfirmasi',
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  requires_prescription boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pharmacists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  registration_verified boolean not null default false,
  credentials_note text,
  bio text,
  availability_note text,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  pharmacist_id uuid references public.pharmacists(id) on delete set null,
  initial_question text not null default '',
  medication_context text,
  allergy_context text,
  status public.consultation_status not null default 'queued',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.prescription_files (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  city text,
  postal_code text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id uuid not null references public.profiles(id) on delete restrict,
  address_id uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'pending',
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','refunded')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_cost numeric(12,2) not null default 0 check (shipping_cost >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  prescription_review_status text not null default 'not_required' check (prescription_review_status in ('not_required','pending','approved','rejected')),
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  image_url text,
  category text not null default 'Edukasi',
  is_published boolean not null default false,
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_active_category_idx on public.products(is_active, category);
create index consultations_patient_created_idx on public.consultations(patient_id, created_at desc);
create index consultations_pharmacist_status_idx on public.consultations(pharmacist_id, status);
create index messages_consultation_created_idx on public.messages(consultation_id, created_at);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index addresses_user_idx on public.addresses(user_id);
create index articles_published_idx on public.articles(is_published, published_at desc);

-- Create a profile automatically; role is fixed to patient regardless of user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Prevent users from promoting themselves by updating profiles.role.
create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Role changes must be performed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
before update on public.profiles
for each row execute procedure public.prevent_self_role_change();

-- Helper functions use trusted profile records, not client-supplied role metadata.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.is_verified_pharmacist()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.pharmacists ph
    join public.profiles p on p.id = ph.user_id
    where p.id = auth.uid() and p.role = 'pharmacist' and ph.registration_verified = true
  );
$$;

create or replace function public.can_access_consultation(target_consultation uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.consultations c
    where c.id = target_consultation
      and (
        c.patient_id = auth.uid()
        or public.is_admin()
        or exists(select 1 from public.pharmacists ph where ph.id = c.pharmacist_id and ph.user_id = auth.uid() and public.is_verified_pharmacist())
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.pharmacists enable row level security;
alter table public.consultations enable row level security;
alter table public.messages enable row level security;
alter table public.prescription_files enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.articles enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles update self or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Deliberately no insert policy: the auth trigger creates patient profiles. No user can self-assign a privileged role.

create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin manage" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "active products public read" on public.products for select to anon, authenticated using (is_active = true or public.is_admin());
create policy "products admin manage" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "verified pharmacists public read" on public.pharmacists for select to anon, authenticated using (registration_verified = true or user_id = auth.uid() or public.is_admin());
create policy "pharmacist profile admin manage" on public.pharmacists for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "consultation patient or assigned professional read" on public.consultations for select to authenticated using (
  patient_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.pharmacists ph where ph.id = pharmacist_id and ph.user_id = auth.uid() and public.is_verified_pharmacist()
  )
);
create policy "patient creates own consultation" on public.consultations for insert to authenticated with check (patient_id = auth.uid() and pharmacist_id is null and status = 'queued');
create policy "admin updates any consultation" on public.consultations for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "assigned verified pharmacist updates consultation" on public.consultations for update to authenticated
using (exists (
  select 1 from public.pharmacists ph
  where ph.id = pharmacist_id and ph.user_id = auth.uid() and public.is_verified_pharmacist()
))
with check (exists (
  select 1 from public.pharmacists ph
  where ph.id = pharmacist_id and ph.user_id = auth.uid() and public.is_verified_pharmacist()
));

create policy "messages participants read" on public.messages for select to authenticated using (public.can_access_consultation(consultation_id));
create policy "participants send own message" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and public.can_access_consultation(consultation_id)
  and exists(select 1 from public.consultations c where c.id = consultation_id and ((c.patient_id = auth.uid() and c.status = 'queued') or c.status in ('assigned','active')))
);
create policy "no message mutation by client" on public.messages for update to authenticated using (false);
create policy "no message deletion by client" on public.messages for delete to authenticated using (false);

create policy "prescription file participants read metadata" on public.prescription_files for select to authenticated using (
  uploaded_by = auth.uid() or public.can_access_consultation(consultation_id) or public.is_admin()
);
create policy "patient upload prescription metadata" on public.prescription_files for insert to authenticated with check (
  uploaded_by = auth.uid() and public.can_access_consultation(consultation_id)
);
create policy "no prescription metadata update" on public.prescription_files for update to authenticated using (false);
create policy "admin can delete prescription metadata" on public.prescription_files for delete to authenticated using (public.is_admin());

create policy "address owner read" on public.addresses for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "address owner insert" on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy "address owner update" on public.addresses for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "address owner delete" on public.addresses for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "order owner or admin read" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Orders intentionally have no client INSERT/UPDATE policy. Add a server-side transactional checkout function before accepting real orders.
create policy "order items owner or admin read" on public.order_items for select to authenticated using (
  public.is_admin() or exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
-- Order item mutations are also server-side only.

create policy "published articles public read" on public.articles for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "articles admin manage" on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "audit log admin read" on public.admin_audit_logs for select to authenticated using (public.is_admin());
-- Do not allow client-side audit log inserts. Write them from trusted backend functions.

-- Realtime delivery for chat messages (ignore if publication/table already configured in your project).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
when undefined_object then
  raise notice 'Publication supabase_realtime not found; enable Realtime for public.messages in Supabase Dashboard.';
end $$;

-- Starter categories. Sample products are intentionally not seeded as real inventory.
insert into public.categories (name, slug) values
 ('Obat bebas','obat-bebas'),
 ('Vitamin','vitamin'),
 ('Alat kesehatan','alat-kesehatan'),
 ('Perawatan diri','perawatan-diri')
on conflict do nothing;
