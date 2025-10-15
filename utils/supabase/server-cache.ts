import { Database } from '@/app/api/types/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

// Create a non-SSR Supabase client for server-side caching
// This client doesn't use cookies, so it can be used inside unstable_cache
function createServerClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Cached episode details query
export const getCachedEpisodeDetails = unstable_cache(
  async (episodeId: string) => {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('episode_with_rating_data')
      .select(
        `
        *,
        podcast_episode_url (url, type)
      `,
      )
      .eq('id', parseInt(episodeId))
      .single();

    if (error) {
      console.error('Error fetching episode details:', error);
      return null;
    }

    return data;
  },
  ['episode-details'],
  {
    tags: ['episode-details'],
    revalidate: 3600, // 1 hour
  },
);

// Cached podcast details query
export const getCachedPodcastDetails = unstable_cache(
  async (podcastId: string) => {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('podcast')
      .select('*')
      .eq('id', parseInt(podcastId))
      .single();

    if (error) {
      console.error('Error fetching podcast details:', error);
      return null;
    }

    return data;
  },
  ['podcast-details'],
  {
    tags: ['podcast-details'],
    revalidate: 3600, // 1 hour
  },
);

// Cached podcast metadata query
export const getCachedPodcastMetadata = unstable_cache(
  async (podcastId: string) => {
    const supabase = createServerClient();

    const { data } = await supabase
      .from('podcast')
      .select('name, image_url, artist_name')
      .eq('id', parseInt(podcastId))
      .single();

    return data;
  },
  ['podcast-metadata'],
  {
    tags: ['podcast-metadata'],
    revalidate: 3600, // 1 hour
  },
);

// Cached episode metadata query
export const getCachedEpisodeMetadata = unstable_cache(
  async (episodeId: string) => {
    const supabase = createServerClient();

    const { data } = await supabase
      .from('podcast_episode')
      .select('episode_name, image_url')
      .eq('id', parseInt(episodeId))
      .single();

    return data;
  },
  ['episode-metadata'],
  {
    tags: ['episode-metadata'],
    revalidate: 3600, // 1 hour
  },
);

// Cached search results
export const getCachedSearchResults = unstable_cache(
  async (
    searchQuery: string,
    userId: string | undefined,
    searchEpisodeName: string,
    searchPodcastName: string,
    pageIndex: number,
    pageSize: number,
  ) => {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .rpc('search_episodes_by_relevance', {
        search_query: searchQuery,
        current_user_id: userId,
        search_episode_name: searchEpisodeName,
        search_podcast_name: searchPodcastName,
      })
      .range((pageIndex - 1) * pageSize, pageIndex * pageSize - 1);

    if (error) {
      throw error;
    }

    return { data, hasNextPage: data.length === pageSize };
  },
  ['search-episodes'],
  {
    tags: ['search-episodes'],
    revalidate: 300, // 5 minutes
  },
);
