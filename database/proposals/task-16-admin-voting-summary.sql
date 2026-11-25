-- PROPOSAL ONLY: review and apply to production only after separate deployment approval.
-- Restores the admin-only dashboard RPC without bypassing table RLS.
-- The existing votes SELECT policy grants global vote visibility only to admin@jcinuniben.com.
-- SECURITY INVOKER preserves that policy and caller permissions.

CREATE OR REPLACE FUNCTION public.get_admin_voting_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_result jsonb;
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
            JOIN public.nominations AS n ON n.id = grouped.nomination_id
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
                SELECT v2.created_at, v2.category, n2.nominee_name
                FROM public.votes AS v2
                JOIN public.nominations AS n2 ON n2.id = v2.nomination_id
                ORDER BY v2.created_at DESC
                LIMIT 50
            ) AS activity
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.votes AS v;

    RETURN COALESCE(v_result, jsonb_build_object(
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

-- Close two existing public data paths identified during the security audit.
-- count_unique_voters() is SECURITY DEFINER and has no caller authorization check.
-- No dashboard code in this repository calls it; the new summary RPC replaces that usage.
REVOKE ALL ON FUNCTION public.count_unique_voters() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_unique_voters() FROM anon;
REVOKE ALL ON FUNCTION public.count_unique_voters() FROM authenticated;

-- vote_details includes voter email, UUID, IP address, and user-agent fields.
-- Repository code does not consume this view; remove direct Data API access.
REVOKE ALL ON TABLE public.vote_details FROM PUBLIC;
REVOKE ALL ON TABLE public.vote_details FROM anon;
REVOKE ALL ON TABLE public.vote_details FROM authenticated;

-- Post-deployment verification:
-- * admin@jcinuniben.com receives aggregates.
-- * anon and all other authenticated users are denied.
-- * pg_proc.prosecdef remains false (SECURITY INVOKER).
-- * No voter UUID, email, IP address, or user-agent is returned.
-- * Voting settings, nominations, and vote rows are not changed by this migration.
