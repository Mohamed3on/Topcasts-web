import { revalidateTag } from 'next/cache';

import { supabaseAdmin } from '@/utils/supabase/server';
import {
  cleanUrl,
  slugifyDetails,
  toPodcastData,
  EpisodeType,
} from './utils';
import { getCachedEpisodeData } from './utils-cached';
import {
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from './db';
import { sendTelegramAlert } from '@/utils/telegram';
import { ReviewType, ScrapedEpisodeData } from '@/app/api/types';

export function tryRevalidate(tag: string) {
  try {
    revalidateTag(tag, 'max');
  } catch {
    // revalidateTag may not work inside waitUntil (no Next.js request context)
  }
}

export function revalidateReviewTags(episodeId: number) {
  revalidateTag(`episode-details:${episodeId}`, 'max');
  revalidateTag('search-episodes', 'max');
  revalidateTag('user-podcast-reviews', 'max');
}

export async function lookupEpisodeByUrl(url: string) {
  const { data } = await supabaseAdmin
    .from('podcast_episode_url')
    .select(
      `
      episode_id,
      podcast_episode!inner (
        id, slug, podcast_id,
        podcast:podcast_id (artist_name, image_url)
      )
    `,
    )
    .eq('url', cleanUrl(url.trim()))
    .single();

  if (!data?.podcast_episode) return null;

  return data.podcast_episode as unknown as {
    id: number;
    slug: string | null;
    podcast_id: number;
    podcast: { artist_name: string | null; image_url: string | null } | null;
  };
}

export async function processNewEpisode(
  type: EpisodeType,
  cleanedUrl: string,
): Promise<{ id: number; slug: string }> {
  const revalidate = (tag: string) => revalidateTag(tag, 'max');
  const scrapedData = await getCachedEpisodeData(type, cleanedUrl);

  if (!scrapedData.episode_name) {
    throw new Error('Episode does not exist or could not be scraped');
  }

  if (!scrapedData.image_url) {
    sendTelegramAlert(
      `⚠️ Scraping returned no image for ${type} URL:\n${cleanedUrl}\nEpisode: ${scrapedData.episode_name}`,
    );
  }

  const slug = slugifyDetails(
    scrapedData.episode_name,
    scrapedData.podcast_name,
  );

  const podcastData = toPodcastData(scrapedData);

  const episodeData: ScrapedEpisodeData = {
    audio_url: scrapedData.audio_url,
    date_published: scrapedData.date_published,
    description: scrapedData.description,
    duration: scrapedData.duration,
    episode_itunes_id: scrapedData.episode_itunes_id,
    episode_name: scrapedData.episode_name,
    formatted_duration: scrapedData.formatted_duration,
    guid: scrapedData.guid,
    image_url: scrapedData.image_url,
    slug,
  };

  const podcastId = await upsertPodcastDetails(supabaseAdmin, podcastData);
  revalidate(`podcast-details:${podcastId}`);
  revalidate(`podcast-metadata:${podcastId}`);
  revalidate('search-episodes');

  const { data: episode, error: episodeError } = await upsertEpisode(
    supabaseAdmin,
    episodeData,
    podcastId,
  );
  if (episodeError || !episode) {
    throw new Error(
      `Failed to upsert episode: ${JSON.stringify(episodeError)}`,
    );
  }

  revalidate(`episode-details:${episode.id}`);
  revalidate(`episode-metadata:${episode.id}`);

  const { error: urlError } = await upsertEpisodeUrl(
    supabaseAdmin,
    cleanedUrl,
    episode.id,
    type,
  );
  if (urlError) {
    throw new Error(
      `Failed to upsert episode URL: ${JSON.stringify(urlError)}`,
    );
  }

  return { id: episode.id, slug };
}

export async function saveReview(
  episodeId: number,
  userId: string,
  rating: ReviewType,
  reviewText?: string,
) {
  const { error } = await supabaseAdmin
    .from('podcast_episode_review')
    .upsert(
      {
        episode_id: episodeId,
        user_id: userId,
        review_type: rating,
        text: reviewText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, episode_id' },
    );
  if (error) {
    console.error('Review upsert failed:', error);
    sendTelegramAlert(
      `⚠️ Review upsert failed for episode ${episodeId} (user ${userId}):\n${JSON.stringify(error)}`,
    );
  }
}
