import { PodcastData, ScrapedEpisodeData } from '@/app/api/types';
import { SupabaseClient } from '@/app/api/types/SupabaseClient';

export async function fetchPodcastByName(
  supabase: SupabaseClient,
  name: string,
) {
  return supabase.from('podcast').select().eq('name', name).single();
}

export async function insertPodcast(
  supabase: SupabaseClient,
  podcastData: PodcastData,
) {
  return supabase.from('podcast').insert(podcastData).select('id').single();
}

export async function updatePodcast(
  supabase: SupabaseClient,
  name: string,
  podcastData: PodcastData,
) {
  return supabase
    .from('podcast')
    .update(podcastData)
    .eq('name', name)
    .select('id')
    .single();
}

export async function upsertEpisode(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
  podcastData: PodcastData,
) {
  const { data: existingPodcast } = await fetchPodcastByName(
    supabase,
    podcastData.name,
  );

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
      podcastData.name,
      podcastData,
    );
    if (updateError)
      throw new Error(
        `Failed to update podcast: ${JSON.stringify(updateError)}`,
      );
    return updatedPodcast.id;
  }
}