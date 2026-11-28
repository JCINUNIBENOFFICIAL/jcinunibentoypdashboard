-- Controlled admin-only toggle for public voting eligibility.
-- This function changes only nominations.ready_for_voting and only for finalist-stage records.

create or replace function public.set_nomination_voting_eligibility(
    p_nomination_ids integer[],
    p_ready_for_voting boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    updated_count integer;
    requested_count integer;
begin
    if auth.uid() is null
       or (auth.jwt() ->> 'email') is distinct from 'admin@jcinuniben.com' then
        raise exception 'Not authorised to manage voting eligibility'
            using errcode = '42501';
    end if;

    if p_nomination_ids is null
       or pg_catalog.cardinality(p_nomination_ids) = 0
       or pg_catalog.cardinality(p_nomination_ids) > 100
       or p_ready_for_voting is null then
        raise exception 'Provide between 1 and 100 nomination IDs and an eligibility value'
            using errcode = '22023';
    end if;

    select pg_catalog.count(distinct requested.id)::integer
      into requested_count
      from pg_catalog.unnest(p_nomination_ids) as requested(id);

    if requested_count <> pg_catalog.cardinality(p_nomination_ids) then
        raise exception 'Duplicate nomination IDs are not allowed'
            using errcode = '22023';
    end if;

    if (
        select pg_catalog.count(*)::integer
        from public.nominations n
        where n.id = any(p_nomination_ids)
          and n.stage = 'finalist'
    ) <> requested_count then
        raise exception 'Every selected record must exist and be at finalist stage'
            using errcode = '22023';
    end if;

    update public.nominations
       set ready_for_voting = p_ready_for_voting
     where id = any(p_nomination_ids)
       and stage = 'finalist';

    get diagnostics updated_count = row_count;
    return updated_count;
end;
$function$;

revoke all on function public.set_nomination_voting_eligibility(integer[], boolean) from public;
revoke all on function public.set_nomination_voting_eligibility(integer[], boolean) from anon;
revoke all on function public.set_nomination_voting_eligibility(integer[], boolean) from authenticated;
grant execute on function public.set_nomination_voting_eligibility(integer[], boolean) to authenticated;
