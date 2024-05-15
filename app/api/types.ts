import { Database } from '@/app/api/types/supabase';

export type ScrapedEpisodeDetails = {
  artist_name?: string | null;
  audio_url?: string | null;
  date_published?: string | null;
  description?: string | null;
  duration?: number | null;
  episode_itunes_id?: string | null;
  episode_name: string;
  formatted_duration?: string | null;
  guid?: string | null;
  image_url?: string | null;
  podcast_itunes_id?: string | null;
  podcast_name: string;
  slug?: string | null;
  rss_feed?: string | null;
  podcast_genres?: string[] | null;
};

export type EpisodeDetails =
  Database['public']['Views']['episode_with_rating_data']['Row'] & {
    urls?: {
      spotify?: string;
      apple?: string;
      castro?: string;
    };
  };

export type ReviewType = 'like' | 'dislike';
