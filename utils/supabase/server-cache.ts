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
export const getCachedEpisodeDetails = async (episodeId: string) => {
  const getEpisodeDetails = unstable_cache(
    async () => {
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
    ['episode-details', episodeId],
    {
      tags: ['episode-details', `episode-details:${episodeId}`],
      revalidate: 3600, // 1 hour
    },
  );

  return getEpisodeDetails();
};

// Cached podcast details query
export const getCachedPodcastDetails = async (podcastId: string) => {
  const getPodcastDetails = unstable_cache(
    async () => {
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
    ['podcast-details', podcastId],
    {
      tags: ['podcast-details', `podcast-details:${podcastId}`],
      revalidate: 3600, // 1 hour
    },
  );

  return getPodcastDetails();
};

// Cached podcast metadata query
export const getCachedPodcastMetadata = async (podcastId: string) => {
  const getPodcastMetadata = unstable_cache(
    async () => {
      const supabase = createServerClient();

      const { data } = await supabase
        .from('podcast')
        .select('name, image_url, artist_name')
        .eq('id', parseInt(podcastId))
        .single();

      return data;
    },
    ['podcast-metadata', podcastId],
    {
      tags: ['podcast-metadata', `podcast-metadata:${podcastId}`],
      revalidate: 3600, // 1 hour
    },
  );

  return getPodcastMetadata();
};

// Cached episode metadata query
export const getCachedEpisodeMetadata = async (episodeId: string) => {
  const getEpisodeMetadata = unstable_cache(
    async () => {
      const supabase = createServerClient();

      const { data } = await supabase
        .from('podcast_episode')
        .select('episode_name, image_url')
        .eq('id', parseInt(episodeId))
        .single();

      return data;
    },
    ['episode-metadata', episodeId],
    {
      tags: ['episode-metadata', `episode-metadata:${episodeId}`],
      revalidate: 3600, // 1 hour
    },
  );

  return getEpisodeMetadata();
};

// Cached profile query
export const getCachedProfile = async (userId: string) => {
  const getProfile = unstable_cache(
    async () => {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();
      return data;
    },
    ['profile', userId],
    {
      tags: ['profile', `profile:${userId}`],
      revalidate: 300, // 5 minutes
    },
  );
  return getProfile();
};

// Cached popular episodes for homepage
export const getCachedPopularEpisodes = async (userId?: string) => {
  const getPopularEpisodes = unstable_cache(
    async () => {
      const supabase = createServerClient();

      if (!userId) {
        const { data } = await supabase
          .from('episode_with_rating_data')
          .select(
            `id, slug, episode_name, image_url, podcast_name, description, twitter_shares, likes, dislikes`,
          )
          .order('popularity_score', { ascending: false })
          .limit(5);
        return data;
      }

      const { data } = await supabase
        .from('episode_with_rating_data')
        .select(
          `id, slug, episode_name, image_url, podcast_name, description, twitter_shares, likes, dislikes,
          podcast_episode_review(review_type, user_id, episode_id)`,
        )
        .eq('podcast_episode_review.user_id', userId)
        .order('popularity_score', { ascending: false })
        .limit(5);
      return data;
    },
    ['popular-episodes', userId || 'anon'],
    {
      tags: ['search-episodes'],
      revalidate: 7200, // 2 hours
    },
  );
  return getPopularEpisodes();
};

// Cached user podcast reviews RPC
export const getCachedUserPodcastReviews = async (
  userId: string,
  podcastId: number,
) => {
  const getUserPodcastReviews = unstable_cache(
    async () => {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc('get_user_podcast_reviews', {
        user_id_param: userId,
        podcast_id_param: podcastId,
      });
      if (error) return null;
      return data;
    },
    ['user-podcast-reviews', userId, String(podcastId)],
    {
      tags: [
        'user-podcast-reviews',
        `user-podcast-reviews:${userId}:${podcastId}`,
      ],
      revalidate: 3600, // 1 hour
    },
  );
  return getUserPodcastReviews();
};

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
