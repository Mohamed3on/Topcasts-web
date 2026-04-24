-- Drop the unused 6-arg variant; only the jsonb variant is called from app code.
DROP FUNCTION IF EXISTS public.upsert_podcast(
  p_name text, p_itunes_id text, p_spotify_id text,
  p_genres text[], p_rss_feed text, p_artist_name text
);
