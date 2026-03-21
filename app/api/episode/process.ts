import { revalidateTag } from 'next/cache';

import { supabaseAdmin } from '@/utils/supabase/server';
import {
  cleanUrl,
  determineType,
  scrapeDataByType,
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
import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '@/app/api/types';

export function tryRevalidate(tag: string) {
  try {
    revalidateTag(tag);
  } catch {
    // revalidateTag may not work inside waitUntil (no Next.js request context)
  }
}

/**
 * Look up an existing episode by URL using a single joined query.
 * Returns episode details or null if not found.
 */
export async function lookupEpisodeByUrl(url: string) {
  const cleanedUrl = cleanUrl(url.trim());
  const type = determineType(cleanedUrl);

  if (!type) return null;

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
    .eq('url', cleanedUrl)
    .single();

  if (!data?.podcast_episode) return null;

  const episode = data.podcast_episode as unknown as {
    id: number;
    slug: string | null;
    podcast_id: number;
    podcast: { artist_name: string | null; image_url: string | null } | null;
  };

  if (!episode?.id) return null;

  return { ...episode, type, cleanedUrl };
}

/**
 * Scrape, persist, and revalidate a new episode.
 * useCache: false for waitUntil contexts (uses scrapeDataByType + tryRevalidate).
 * Throws on failure.
 */
export async function processNewEpisode(
  type: EpisodeType,
  cleanedUrl: string,
  opts?: { useCache?: boolean },
): Promise<{ id: number; slug: string }> {
  const useCache = opts?.useCache ?? true;
  const revalidate = useCache ? revalidateTag : tryRevalidate;

  const scrapedData = (useCache
    ? await getCachedEpisodeData(type, cleanedUrl)
    : await scrapeDataByType(type, cleanedUrl)) as ScrapedEpisodeDetails;

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

/**
 * Upsert a review for an episode. Returns a promise so callers can
 * await it or pass it to waitUntil.
 */
export function saveReview(
  episodeId: number,
  userId: string,
  rating: string,
  reviewText?: string,
) {
  return supabaseAdmin
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
    )
    .then(({ error }) => {
      if (error) {
        console.error('Review upsert failed:', error);
        return;
      }
      tryRevalidate(`episode-details:${episodeId}`);
      tryRevalidate('search-episodes');
      tryRevalidate('user-podcast-reviews');
    });
}
