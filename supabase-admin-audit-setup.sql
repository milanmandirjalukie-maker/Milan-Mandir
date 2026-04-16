begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists admin_audit_logs_admin_select on public.admin_audit_logs;
create policy admin_audit_logs_admin_select
on public.admin_audit_logs
for select
to authenticated
using ((select auth.uid()) is not null and private.is_admin());

drop policy if exists admin_audit_logs_admin_insert on public.admin_audit_logs;
create policy admin_audit_logs_admin_insert
on public.admin_audit_logs
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and private.is_admin()
  and actor_id = auth.uid()
);

commit;
