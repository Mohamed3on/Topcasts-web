import { Database } from '@/app/api/types/supabase';

export type ScrapedPodcastData = {
  artist_name?: string;
  rss_feed?: string;
  podcast_genres?: string[];
  spotify_show_id?: string;
  podcast_name: string;
  podcast_itunes_id?: string;
};

export type ScrapedEpisodeData = {
  audio_url?: string | null;
  date_published?: string | null;
  description?: string | null;
  duration?: number | null;
  episode_itunes_id?: string;
  episode_name: string;
  formatted_duration?: string | null;
  guid?: string | null;
  image_url?: string | null;
  slug?: string | null;
};

export type ScrapedEpisodeDetails = ScrapedPodcastData & ScrapedEpisodeData;

export type EpisodeDetails =
  Database['public']['Views']['episode_with_rating_data']['Row'] & {
    urls?: {
      spotify?: string;
      apple?: string;
      castro?: string;
    };
  };

export type ReviewType = 'like' | 'dislike';

export type PodcastData = {
  artist_name?: string;
  genres?: string[];
  itunes_id?: string;
  name: string;
  rss_feed?: string;
  spotify_id?: string;
};
