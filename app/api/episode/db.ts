import { PodcastData, ScrapedEpisodeData } from '@/app/api/types';
import { Json } from '@/app/api/types/supabase';
import { SupabaseAdmin } from '@/utils/supabase/server';
import { findCodeMatch } from './identity';
import { EpisodeType } from './utils';

export async function updatePodcast(
  supabase: SupabaseAdmin,
  id: number,
  podcastData: PodcastData,
) {
  return supabase
    .from('podcast')
    .update(podcastData)
    .eq('id', id)
    .select('id')
    .single();
}

export async function upsertEpisode(
  supabase: SupabaseAdmin,
  episodeData: ScrapedEpisodeData,
  podcastId: number,
) {
  return supabase
    .from('podcast_episode')
    .upsert({ ...episodeData, podcast_id: podcastId }, { onConflict: 'slug' })
    .select('id')
    .single();
}

// Every stored episode of a podcast, to match a newly shared one against.
export async function getPodcastEpisodes(
  supabase: SupabaseAdmin,
  podcastId: number,
) {
  return supabase
    .from('podcast_episode')
    .select(
      'id, slug, episode_name, date_published, duration, guid, podcast_episode_url (type, url)',
    )
    .eq('podcast_id', podcastId);
}

export async function getEpisodeDescriptions(
  supabase: SupabaseAdmin,
  ids: number[],
) {
  return supabase
    .from('podcast_episode')
    .select('id, description')
    .in('id', ids);
}

// Another platform's copy of a stored episode only fills what the row lacks;
// its title, slug and show notes stay as first saved.
export async function fillEpisode(
  supabase: SupabaseAdmin,
  id: number,
  episodeData: ScrapedEpisodeData,
) {
  const fillable = [
    'audio_url',
    'date_published',
    'description',
    'duration',
    'episode_itunes_id',
    'guid',
    'image_url',
  ] as const;
  const { data: stored } = await supabase
    .from('podcast_episode')
    .select(
      'audio_url, date_published, description, duration, episode_itunes_id, guid, image_url',
    )
    .eq('id', id)
    .single();
  const patch = Object.fromEntries(
    fillable
      .filter((k) => episodeData[k] != null && stored?.[k] == null)
      .map((k) => [k, episodeData[k]]),
  );
  if (Object.keys(patch).length) {
    await supabase.from('podcast_episode').update(patch).eq('id', id);
  }
  return supabase
    .from('podcast_episode')
    .select('id, slug')
    .eq('id', id)
    .single();
}

// A slug held by another episode — say, a rerun with the same title — gets a
// numeric suffix. If the holder is this very episode (two shares racing), it
// is reused, as the old upsert-on-slug did.
export async function insertEpisode(
  supabase: SupabaseAdmin,
  episodeData: ScrapedEpisodeData,
  podcastId: number,
) {
  const base = episodeData.slug ?? '';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const inserted = await supabase
      .from('podcast_episode')
      .insert({ ...episodeData, slug, podcast_id: podcastId })
      .select('id, slug')
      .single();
    if (
      inserted.error?.code !== '23505' ||
      !inserted.error.message.includes('slug') ||
      n === 5
    )
      return inserted;

    const { data: holder } = await supabase
      .from('podcast_episode')
      .select('id, podcast_id, episode_name, date_published, duration, guid')
      .eq('slug', slug)
      .single();
    if (
      holder?.podcast_id === podcastId &&
      findCodeMatch(toEpisodeFacts(episodeData), [toCandidate(holder)])
    ) {
      return fillEpisode(supabase, holder.id, episodeData);
    }
  }
}

export const toEpisodeFacts = (e: ScrapedEpisodeData) => ({
  title: e.episode_name,
  date: e.date_published,
  duration: e.duration,
  guid: e.guid,
  description: e.description,
});

export const toCandidate = (row: {
  id: number;
  episode_name: string;
  date_published: string | null;
  duration: number | null;
  guid: string | null;
  podcast_episode_url?: { type: string; url: string }[];
}) => ({
  id: row.id,
  title: row.episode_name,
  date: row.date_published,
  duration: row.duration,
  guid: row.guid,
  urls: row.podcast_episode_url,
});

export async function upsertEpisodeUrl(
  supabase: SupabaseAdmin,
  cleanedUrl: string,
  episodeId: number,
  type: EpisodeType,
) {
  return supabase
    .from('podcast_episode_url')
    .upsert(
      { url: cleanedUrl, episode_id: episodeId, type },
      { onConflict: 'url' },
    )
    .select('episode_id')
    .single();
}

// RPC matches on name/itunes_id/spotify_id/castro_id/rss_feed (OR), fills nulls on update.
export async function upsertPodcastDetails(
  supabase: SupabaseAdmin,
  podcastData: PodcastData,
): Promise<number> {
  const { data, error } = await supabase.rpc('upsert_podcast', {
    p: podcastData as unknown as Json,
  });
  if (error || data == null) {
    throw new Error(`Failed to upsert podcast: ${JSON.stringify(error)}`);
  }
  return data;
}

// Another app's listing of a stored show only fills what the row lacks (this
// app's ID first of all); its name stays as first saved.
export async function fillPodcast(
  supabase: SupabaseAdmin,
  stored: { id: number } & { [K in keyof PodcastData]?: unknown },
  podcastData: PodcastData,
): Promise<number> {
  const patch = Object.fromEntries(
    Object.entries(podcastData).filter(
      ([k, v]) => k !== 'name' && v != null && stored[k as keyof PodcastData] == null,
    ),
  );
  if (Object.keys(patch).length) {
    const { error } = await supabase
      .from('podcast')
      .update(patch)
      .eq('id', stored.id);
    if (error) {
      throw new Error(`Failed to fill podcast: ${JSON.stringify(error)}`);
    }
  }
  return stored.id;
}
