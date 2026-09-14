create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  primary key (organisation_id,user_id)
);

create table if not exists public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (organisation_id,email)
);

create table if not exists public.course_progress (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  read jsonb not null default '[]'::jsonb,
  best integer not null default 0,
  failed_attempts integer not null default 0,
  question integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  submitted boolean not null default false,
  test_started_at timestamptz,
  test_expired boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (organisation_id,user_id,course_id)
);

create table if not exists public.test_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  score integer not null,
  passed boolean not null,
  expired boolean not null default false,
  attempt integer not null default 1,
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

create index if not exists organisation_members_user_idx on public.organisation_members(user_id,status,role);
create index if not exists organisation_invites_org_idx on public.organisation_invites(organisation_id,status,email);
create index if not exists course_progress_user_idx on public.course_progress(user_id,organisation_id);
create index if not exists test_records_org_user_idx on public.test_records(organisation_id,user_id,course_id,completed_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

drop trigger if exists course_progress_touch_updated_at on public.course_progress;
create trigger course_progress_touch_updated_at before update on public.course_progress for each row execute function public.touch_updated_at();

create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m
    where m.organisation_id = org and m.user_id = auth.uid() and m.status = 'active' and m.role = 'admin'
  );
$$;

create or replace function public.accept_matching_pending_invites()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organisation_members (organisation_id,user_id,role,status)
  select i.organisation_id,new.id,i.role,'active'
  from public.organisation_invites i
  where lower(i.email) = lower(new.email) and i.status = 'pending'
  on conflict (organisation_id,user_id) do update set role = excluded.role, status = 'active';

  update public.organisation_invites
  set status = 'accepted', accepted_by = new.id, accepted_at = coalesce(accepted_at, now())
  where lower(email) = lower(new.email) and status = 'pending';

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email)
  values (new.id, coalesce(new.email,''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists profiles_accept_invites on public.profiles;
create trigger profiles_accept_invites after insert or update of email on public.profiles for each row execute function public.accept_matching_pending_invites();

create or replace function public.make_creator_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organisation_members (organisation_id,user_id,role,status)
  values (new.id,new.created_by,'admin','active')
  on conflict (organisation_id,user_id) do update set role = 'admin', status = 'active';
  return new;
end;
$$;

drop trigger if exists organisations_make_creator_admin on public.organisations;
create trigger organisations_make_creator_admin after insert on public.organisations for each row execute function public.make_creator_admin();

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_invites enable row level security;
alter table public.course_progress enable row level security;
alter table public.test_records enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.organisations from anon, authenticated;
revoke all on public.organisation_members from anon, authenticated;
revoke all on public.organisation_invites from anon, authenticated;
revoke all on public.course_progress from anon, authenticated;
revoke all on public.test_records from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update on public.organisations to authenticated;
grant select, update on public.organisation_members to authenticated;
grant select on public.organisation_invites to authenticated;
grant select, insert, update on public.course_progress to authenticated;
grant select, insert on public.test_records to authenticated;

drop policy if exists profiles_read_self_or_org_admin on public.profiles;
create policy profiles_read_self_or_org_admin on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.organisation_members subject
    join public.organisation_members admin on admin.organisation_id = subject.organisation_id
    where subject.user_id = profiles.id and subject.status = 'active'
      and admin.user_id = auth.uid() and admin.status = 'active' and admin.role = 'admin'
  )
);

drop policy if exists organisations_member_read on public.organisations;
create policy organisations_member_read on public.organisations for select to authenticated using (public.is_org_member(id));

drop policy if exists organisations_creator_insert on public.organisations;
create policy organisations_creator_insert on public.organisations for insert to authenticated with check (created_by = auth.uid());

drop policy if exists organisations_admin_update on public.organisations;
create policy organisations_admin_update on public.organisations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

drop policy if exists members_member_read on public.organisation_members;
create policy members_member_read on public.organisation_members for select to authenticated using (public.is_org_member(organisation_id));

drop policy if exists members_admin_update on public.organisation_members;
create policy members_admin_update on public.organisation_members for update to authenticated using (public.is_org_admin(organisation_id)) with check (public.is_org_admin(organisation_id));

drop policy if exists invites_admin_read on public.organisation_invites;
create policy invites_admin_read on public.organisation_invites for select to authenticated using (public.is_org_admin(organisation_id));

drop policy if exists progress_owner_or_admin_read on public.course_progress;
create policy progress_owner_or_admin_read on public.course_progress for select to authenticated using (user_id = auth.uid() or public.is_org_admin(organisation_id));

drop policy if exists progress_owner_insert on public.course_progress;
create policy progress_owner_insert on public.course_progress for insert to authenticated with check (user_id = auth.uid() and public.is_org_member(organisation_id));

drop policy if exists progress_owner_update on public.course_progress;
create policy progress_owner_update on public.course_progress for update to authenticated using (user_id = auth.uid() and public.is_org_member(organisation_id)) with check (user_id = auth.uid() and public.is_org_member(organisation_id));

drop policy if exists records_owner_or_admin_read on public.test_records;
create policy records_owner_or_admin_read on public.test_records for select to authenticated using (user_id = auth.uid() or public.is_org_admin(organisation_id));

drop policy if exists records_owner_insert on public.test_records;
create policy records_owner_insert on public.test_records for insert to authenticated with check (user_id = auth.uid() and public.is_org_member(organisation_id));
