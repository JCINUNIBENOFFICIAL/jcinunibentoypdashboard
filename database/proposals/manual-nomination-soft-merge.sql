-- Proposal only: review and manually link duplicate nomination records.
-- Apply to the Supabase project only after review and explicit approval.
-- This is a soft merge: source nomination rows and all their data remain intact.

alter table public.nominations
    add column if not exists merged_into_id integer
    references public.nominations(id) on delete restrict;

create index if not exists idx_nominations_merged_into_id
    on public.nominations(merged_into_id);

create table if not exists public.nomination_merge_audit (
    id bigint generated always as identity primary key,
    primary_nomination_id integer not null references public.nominations(id) on delete restrict,
    duplicate_nomination_ids integer[] not null,
    previous_records jsonb not null,
    performed_by uuid not null references auth.users(id) on delete restrict,
    performed_at timestamptz not null default now()
);

alter table public.nomination_merge_audit enable row level security;
revoke all on public.nomination_merge_audit from public, anon, authenticated;
grant select, insert on public.nomination_merge_audit to authenticated;

drop policy if exists "TOYP administrators can read nomination merge audit"
    on public.nomination_merge_audit;
create policy "TOYP administrators can read nomination merge audit"
    on public.nomination_merge_audit
    for select to authenticated
    using ((select auth.jwt() ->> 'email') = 'admin@jcinuniben.com');

create or replace function public.merge_nomination_records(
    p_primary_id integer,
    p_duplicate_ids integer[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_actor uuid;
    v_category text;
    v_requested integer;
    v_found integer;
    v_updated integer;
    v_previous jsonb;
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

    select n.category into v_category
      from public.nominations n
     where n.id = p_primary_id
       and n.merged_into_id is null
     for update;
    if not found then
        raise exception 'The primary record does not exist or is already linked to another record'
            using errcode = '22023';
    end if;

    perform 1
      from public.nominations n
     where n.id = any(p_duplicate_ids)
     order by n.id
     for update;

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

    -- Keep the relationship one level deep: a record that already has linked
    -- children cannot itself be moved under another primary record.
    if exists (
        select 1
        from public.nominations child
        where child.merged_into_id = any(p_duplicate_ids)
    ) then
        raise exception 'A selected duplicate already has linked records. Use its existing primary record instead.'
            using errcode = '22023';
    end if;

    select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(n) order by n.id)
      into v_previous
      from public.nominations n
     where n.id = any(p_duplicate_ids);

    update public.nominations
       set merged_into_id = p_primary_id,
           updated_at = now()
     where id = any(p_duplicate_ids)
       and merged_into_id is null;

    get diagnostics v_updated = row_count;
    if v_updated <> v_requested then
        raise exception 'Not all selected records could be linked; transaction cancelled'
            using errcode = '40001';
    end if;

    insert into public.nomination_merge_audit (
        primary_nomination_id, duplicate_nomination_ids, previous_records, performed_by
    ) values (
        p_primary_id, p_duplicate_ids, coalesce(v_previous, '[]'::jsonb), v_actor
    );

    return v_updated;
end;
$$;

revoke all on function public.merge_nomination_records(integer, integer[]) from public, anon;
grant execute on function public.merge_nomination_records(integer, integer[]) to authenticated;
