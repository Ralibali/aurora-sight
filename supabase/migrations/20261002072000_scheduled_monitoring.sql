-- Aurora Sight recurring monitoring.
-- Adds bounded, resumable schedule state and a service-role-only atomic claim RPC.

alter table public.schedules
  add column if not exists provider_config_id uuid references public.provider_configs(id) on delete set null,
  add column if not exists search_mode public.search_mode not null default 'offline',
  add column if not exists running_at timestamptz,
  add column if not exists last_run_id uuid references public.audit_runs(id) on delete set null,
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz;

create index if not exists schedules_due_idx
  on public.schedules(enabled, next_run_at)
  where enabled = true;

create or replace function public.claim_due_sight_schedules(p_limit integer default 1)
returns setof public.schedules
language sql
security invoker
set search_path = ''
as $$
  with due as (
    select s.id
    from public.schedules s
    where s.enabled = true
      and s.next_run_at is not null
      and s.next_run_at <= now()
      and (s.running_at is null or s.running_at < now() - interval '2 hours')
    order by s.next_run_at asc
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 3)
  )
  update public.schedules s
     set running_at = now(),
         last_error = null
    from due
   where s.id = due.id
  returning s.*;
$$;

revoke all on function public.claim_due_sight_schedules(integer) from public, anon, authenticated;
grant execute on function public.claim_due_sight_schedules(integer) to service_role;
