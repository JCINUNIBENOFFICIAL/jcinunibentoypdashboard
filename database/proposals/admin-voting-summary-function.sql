-- PROPOSAL ONLY — do not run against production without separate approval.
-- Restores the RPC consumed by static/scripts.js for admin voting statistics.
-- Uses SECURITY INVOKER so the existing votes RLS policy remains in force.
-- The current votes SELECT policy grants global access only to admin@jcinuniben.com.
-- This endpoint returns aggregate vote data only; it excludes voter IDs, email,
-- IP addresses, and user-agent details.

CREATE OR REPLACE FUNCTION public.get_admin_voting_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    result jsonb;
BEGIN
    IF auth.uid() IS NULL
       OR (auth.jwt() ->> 'email') IS DISTINCT FROM 'admin@jcinuniben.com' THEN
        RAISE EXCEPTION 'Not authorised to view global voting statistics'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'total_votes', COUNT(*)::bigint,
        'votes_today', COUNT(*) FILTER (
            WHERE v.created_at >= (
                date_trunc('day', now() AT TIME ZONE 'Africa/Lagos')
                AT TIME ZONE 'Africa/Lagos'
            )
            AND v.created_at < (
                (date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') + interval '1 day')
                AT TIME ZONE 'Africa/Lagos'
            )
        )::bigint,
        'unique_voters', COUNT(DISTINCT v.voter_id)::bigint,
        'nominee_counts', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'nomination_id', grouped.nomination_id,
                    'nominee_name', n.nominee_name,
                    'category', grouped.category,
                    'vote_count', grouped.vote_count
                )
                ORDER BY grouped.category, grouped.vote_count DESC, n.nominee_name
            )
            FROM (
                SELECT nomination_id, category, COUNT(*)::bigint AS vote_count
                FROM public.votes
                GROUP BY nomination_id, category
            ) AS grouped
            JOIN public.nominations AS n
              ON n.id = grouped.nomination_id
        ), '[]'::jsonb),
        'recent_activity', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'created_at', activity.created_at,
                    'category', activity.category,
                    'nominee_name', activity.nominee_name
                )
                ORDER BY activity.created_at DESC
            )
            FROM (
                SELECT v.created_at, v.category, n.nominee_name
                FROM public.votes AS v
                JOIN public.nominations AS n
                  ON n.id = v.nomination_id
                ORDER BY v.created_at DESC
                LIMIT 50
            ) AS activity
        ), '[]'::jsonb)
    )
    INTO result
    FROM public.votes AS v;

    RETURN COALESCE(result, jsonb_build_object(
        'total_votes', 0,
        'votes_today', 0,
        'unique_voters', 0,
        'nominee_counts', '[]'::jsonb,
        'recent_activity', '[]'::jsonb
    ));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM anon;
REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_voting_summary() TO authenticated;

-- Post-deployment checks:
-- 1. The designated admin can call the function and receives the expected JSON keys.
-- 2. Anonymous and non-admin authenticated users receive SQLSTATE 42501.
-- 3. Confirm counts against direct admin-only read queries.
-- 4. Confirm votes_today uses the Africa/Lagos calendar day.
