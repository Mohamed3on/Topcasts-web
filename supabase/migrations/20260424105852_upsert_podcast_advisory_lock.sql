-- Serialize concurrent upserts of the same podcast so two racing shares don't
-- both SELECT null, both INSERT, and trip a unique constraint.
CREATE OR REPLACE FUNCTION public.upsert_podcast(p jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id int;
  v_name        text := p->>'name';
  v_itunes      text := p->>'itunes_id';
  v_spotify     text := p->>'spotify_id';
  v_castro      text := p->>'castro_id';
  v_rss         text := p->>'rss_feed';
  v_artist      text := p->>'artist_name';
  v_image       text := p->>'image_url';
  v_genres      text[] := CASE WHEN p ? 'genres'
    THEN ARRAY(SELECT jsonb_array_elements_text(p->'genres'))
    ELSE NULL END;
  v_lock_key    text := COALESCE(v_itunes, v_spotify, v_castro, v_name);
BEGIN
  IF v_lock_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('upsert_podcast:' || v_lock_key));
  END IF;

  SELECT id INTO v_id FROM podcast
  WHERE (v_name    IS NOT NULL AND name       = v_name)
     OR (v_itunes  IS NOT NULL AND itunes_id  = v_itunes)
     OR (v_spotify IS NOT NULL AND spotify_id = v_spotify)
     OR (v_castro  IS NOT NULL AND castro_id  = v_castro)
  ORDER BY id ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE podcast SET
      name        = COALESCE(v_name,    name),
      itunes_id   = COALESCE(v_itunes,  itunes_id),
      spotify_id  = COALESCE(v_spotify, spotify_id),
      castro_id   = COALESCE(v_castro,  castro_id),
      rss_feed    = COALESCE(v_rss,     rss_feed),
      artist_name = COALESCE(v_artist,  artist_name),
      image_url   = COALESCE(v_image,   image_url),
      genres      = COALESCE(v_genres,  genres)
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO podcast (name, itunes_id, spotify_id, castro_id, rss_feed, artist_name, image_url, genres)
  VALUES (v_name, v_itunes, v_spotify, v_castro, v_rss, v_artist, v_image, v_genres)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
