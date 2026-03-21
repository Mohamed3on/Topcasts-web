import { PodcastData, ScrapedEpisodeData } from '@/app/api/types';
import { SupabaseAdmin } from '@/utils/supabase/server';

export async function fetchPodcast(
  supabase: SupabaseAdmin,
  podcastData: PodcastData,
) {
  const filters: string[] = [];
  if (podcastData.name) {
    const safeName = podcastData.name.replace(/"/g, '""');
    filters.push(`name.eq."${safeName}"`);
  }
  if (podcastData.itunes_id) {
    filters.push(`itunes_id.eq.${podcastData.itunes_id}`);
  }
  if (podcastData.spotify_id) {
    const safeSpotifyId = podcastData.spotify_id.replace(/"/g, '""');
    filters.push(`spotify_id.eq."${safeSpotifyId}"`);
  }
  if (podcastData.castro_id) {
    const safeCastroId = podcastData.castro_id.replace(/"/g, '""');
    filters.push(`castro_id.eq."${safeCastroId}"`);
  }

  if (filters.length === 0) {
    return { data: null, error: null };
  }

  return supabase
    .from('podcast')
    .select()
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();
}

export async function insertPodcast(
  supabase: SupabaseAdmin,
  podcastData: PodcastData,
) {
  return supabase.from('podcast').insert(podcastData).select('id').single();
}

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

export async function upsertEpisodeUrl(
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

export async function upsertPodcastDetails(
  supabase: SupabaseAdmin,
  podcastData: PodcastData,
) {
  const { data: existingPodcast } = await fetchPodcast(supabase, podcastData);

  if (!existingPodcast) {
    const { data: newPodcast, error: newError } = await insertPodcast(
      supabase,
      podcastData,
    );
    if (newError)
      throw new Error(`Failed to insert podcast: ${JSON.stringify(newError)}`);
    return newPodcast.id;
  } else {
    const { data: updatedPodcast, error: updateError } = await updatePodcast(
      supabase,
      existingPodcast.id,
      podcastData,
    );
    if (updateError)
      throw new Error(
        `Failed to update podcast: ${JSON.stringify(updateError)}`,
      );
    return updatedPodcast.id;
  }
}
