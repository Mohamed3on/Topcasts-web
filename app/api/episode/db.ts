import { PodcastData, ScrapedEpisodeData } from '@/app/api/types';
import { Json } from '@/app/api/types/supabase';
import { SupabaseAdmin } from '@/utils/supabase/server';

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

export async function insertEpisodeUrl(
  supabase: SupabaseAdmin,
  cleanedUrl: string,
  episodeId: number,
  type: 'apple' | 'spotify' | 'castro',
) {
  return supabase
    .from('podcast_episode_url')
    .insert({ url: cleanedUrl, episode_id: episodeId, type })
    .select('episode_id')
    .single();
}

// Atomic match-or-insert in one roundtrip (see migration upsert_podcast_rpc).
// OR-matches by name/itunes_id/spotify_id/castro_id; fills nulls on update.
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
