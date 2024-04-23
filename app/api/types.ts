export type EpisodeDetails = {
  artist_name?: string | null;
  audio_url?: string | null;
  date_published?: string | null;
  description?: string | null;
  duration?: number | null;
  episode_itunes_id?: string | null;
  episode_name: string;
  formatted_duration?: string | null;
  guid?: string | null;
  id?: number;
  image_url?: string | null;
  podcast_itunes_id?: string | null;
  podcast_name: string;
  slug?: string | null;

  urls?: {
    spotify?: string;
    apple?: string;
    castro?: string;
  };
};
