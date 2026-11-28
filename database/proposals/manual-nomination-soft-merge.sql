-- Proposal only. Apply only after review and explicit approval.
-- Soft merge: original nomination rows and all nomination data remain unchanged.
-- Only merged_into_id is updated; audit records contain IDs/state, not contact details.

alter table public.nominations
    add column if not exists merged_into_id integer
    references public.nominations(id) on delete restrict;

create index if not exists idx_nominations_merged_into_id
    on public.nominations(merged_into_id);

create table if not exists public.nomination_merge_audit (
    id bigint generated always as identity primary key,
    primary_nomination_id integer not null references public.nominations(id) on delete restrict,
    duplicate_nomination_ids integer[] not null,
    previous_merge_state jsonb not null,
    performed_by uuid not null references auth.users(id) on delete restrict,
    performed_at timestamptz not null default now()
);

alter table public.nomination_merge_audit enable row level security;
revoke all on public.nomination_merge_audit from public, anon, authenticated;
grant select on public.nomination_merge_audit to authenticated;

drop policy if exists "TOYP administrators can read nomination merge audit"
    on public.nomination_merge_audit;
create policy "TOYP administrators can read nomination merge audit"
    on public.nomination_merge_audit
    for select to authenticated
    using ((select auth.jwt() ->> 'email') = 'admin@jcinuniben.com');

-- Prevent direct API clients from creating or changing merge links. The merge RPC
-- is owned by the nominations table owner, so only that controlled execution path
-- can change this relationship.
create or replace function public.guard_nomination_merge_link()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
    v_table_owner name;
begin
    if (tg_op = 'INSERT' and new.merged_into_id is not null)
       or (tg_op = 'UPDATE' and new.merged_into_id is distinct from old.merged_into_id) then
        select pg_catalog.pg_get_userbyid(c.relowner)
          into v_table_owner
          from pg_catalog.pg_class c
         where c.oid = 'public.nominations'::regclass;

        if current_user <> v_table_owner then
            raise exception 'Merge relationships can only be changed through the authorised merge operation'
                using errcode = '42501';
        end if;
    end if;
    return new;
end;
$function$;

drop trigger if exists nominations_guard_merge_link on public.nominations;
create trigger nominations_guard_merge_link
before insert or update of merged_into_id on public.nominations
for each row execute function public.guard_nomination_merge_link();

create or replace function public.merge_nomination_records(
    p_primary_id integer,
    p_duplicate_ids integer[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_actor uuid;
    v_category text;
    v_requested integer;
    v_found integer;
    v_updated integer;
    v_previous_state jsonb;
begin
    v_actor := auth.uid();
    if v_actor is null
       or (auth.jwt() ->> 'email') is distinct from 'admin@jcinuniben.com' then
        raise exception 'Not authorised to merge nomination records' using errcode = '42501';
    end if;

    if p_primary_id is null
       or p_duplicate_ids is null
       or pg_catalog.cardinality(p_duplicate_ids) < 1
       or pg_catalog.cardinality(p_duplicate_ids) > 50
       or pg_catalog.array_position(p_duplicate_ids, null) is not null
       or p_primary_id = any(p_duplicate_ids) then
        raise exception 'Choose one primary record and between 1 and 50 different duplicate records'
            using errcode = '22023';
    end if;

    select pg_catalog.count(distinct x.id)::integer
      into v_requested
      from pg_catalog.unnest(p_duplicate_ids) as x(id);
    if v_requested <> pg_catalog.cardinality(p_duplicate_ids) then
        raise exception 'Duplicate record IDs were supplied more than once' using errcode = '22023';
    end if;

    -- Lock every involved row in a consistent order to reduce deadlock risk.
    perform 1
      from public.nominations n
     where n.id = any(pg_catalog.array_append(p_duplicate_ids, p_primary_id))
     order by n.id
     for update;

    select n.category
      into v_category
      from public.nominations n
     where n.id = p_primary_id
       and n.merged_into_id is null;
    if not found then
        raise exception 'The primary record does not exist or is already linked to another record'
            using errcode = '22023';
    end if;

    select pg_catalog.count(*)::integer
      into v_found
      from public.nominations n
     where n.id = any(p_duplicate_ids)
       and n.merged_into_id is null
       and n.category is not distinct from v_category;
    if v_found <> v_requested then
        raise exception 'Every selected record must exist, be unmerged, and belong to the same category as the primary record'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from public.nominations child
        where child.merged_into_id = any(p_duplicate_ids)
    ) then
        raise exception 'A selected duplicate already has linked records. Use its existing primary record instead.'
            using errcode = '22023';
    end if;

    select pg_catalog.jsonb_agg(
               pg_catalog.jsonb_build_object('id', n.id, 'merged_into_id', n.merged_into_id)
               order by n.id
           )
      into v_previous_state
      from public.nominations n
     where n.id = any(p_duplicate_ids);

    update public.nominations
       set merged_into_id = p_primary_id,
           updated_at = pg_catalog.now()
     where id = any(p_duplicate_ids)
       and merged_into_id is null;

    get diagnostics v_updated = row_count;
    if v_updated <> v_requested then
        raise exception 'Not all selected records could be linked; transaction cancelled'
            using errcode = '40001';
    end if;

    insert into public.nomination_merge_audit (
        primary_nomination_id, duplicate_nomination_ids, previous_merge_state, performed_by
    ) values (
        p_primary_id, p_duplicate_ids, coalesce(v_previous_state, '[]'::jsonb), v_actor
    );

    return v_updated;
end;
$function$;

-- Ensure the SECURITY DEFINER function runs as the nominations table owner;
-- the trigger above then rejects direct client updates to merged_into_id.
do $owner$
declare
    v_owner name;
begin
    select pg_catalog.pg_get_userbyid(c.relowner)
      into v_owner
      from pg_catalog.pg_class c
     where c.oid = 'public.nominations'::regclass;
    execute pg_catalog.format(
        'alter function public.merge_nomination_records(integer, integer[]) owner to %I',
        v_owner
    );
end;
$owner$;

revoke all on function public.merge_nomination_records(integer, integer[]) from public, anon;
grant execute on function public.merge_nomination_records(integer, integer[]) to authenticated;

