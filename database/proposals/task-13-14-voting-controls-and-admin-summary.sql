-- PROPOSAL ONLY — do not execute against production without explicit approval.
-- Task 13: enforce voting-open, scheduled-close, voter identity, and eligible nominee checks.
-- Task 14: expose privacy-safe global vote aggregates only to the designated dashboard administrator.
--
-- Preconditions:
--   * Confirm admin@jcinuniben.com is the intended authorised reporting administrator.
--   * Review the existing votes INSERT policy before applying the ALTER POLICY statement.
--   * Test on a staging/preview Supabase project first.
--
-- 1) Enforce the voting window and nominee eligibility at the database boundary.
ALTER POLICY "Users can insert their own votes"
ON public.votes
WITH CHECK (
    voter_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.settings AS s
        WHERE s.key = 'voting_open'
          AND s.value = 'true'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM public.settings AS s
        WHERE s.key = 'voting_close_time'
          AND NULLIF(s.value, '') IS NOT NULL
          AND s.value::timestamptz <= now()
    )
    AND EXISTS (
        SELECT 1
        FROM public.nominations AS n
        WHERE n.id = nomination_id
          AND n.category = public.votes.category
          AND n.ready_for_voting = true
    )
);

-- 2) Admin-only summary. It deliberately excludes voter email, voter UUID, IP address,
--    user agent, and any other voter-identifying data.
CREATE OR REPLACE FUNCTION public.get_admin_voting_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
        'total_votes', COUNT(*),
        'votes_today', COUNT(*) FILTER (
            WHERE v.created_at >= date_trunc('day', now())
        ),
        'unique_voters', COUNT(DISTINCT v.voter_id),
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

-- Functions are executable by PUBLIC by default. Explicitly restrict this endpoint.
REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM anon;
REVOKE ALL ON FUNCTION public.get_admin_voting_summary() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_voting_summary() TO authenticated;

-- After deployment:
--   1) Verify unauthenticated and non-admin authenticated calls fail with 42501.
--   2) Verify the designated administrator receives aggregate counts only.
--   3) Verify votes are rejected when voting_open is false or voting_close_time has passed.
--   4) Verify votes are rejected for nominees not marked ready_for_voting or with a category mismatch.
--   5) Verify one-vote-per-voter-per-category remains enforced by votes_voter_id_category_key.
