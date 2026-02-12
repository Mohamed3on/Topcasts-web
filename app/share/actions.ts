'use server';

import { revalidateTag } from 'next/cache';

import { supabaseAdmin } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/ssr';
import { cleanUrl, determineType, slugifyDetails } from '@/app/api/episode/utils';
import { getCachedEpisodeData } from '@/app/api/episode/utils-cached';
import {
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from '@/app/api/episode/db';
import { sendTelegramAlert } from '@/utils/telegram';
import { ScrapedEpisodeData } from '@/app/api/types';
import { saveReviewInBackground } from './background';

/**
 * Look up an existing episode by URL using a single joined query.
 * Returns episode id/slug or null if not found.
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
 * Server action for sharing an episode. Used by the manual form
 * (when no rating is pre-selected in the URL).
 */
export async function shareEpisode(
  url: string,
  rating: string,
  reviewText?: string,
): Promise<{ id: number; slug: string | null } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;
  const cleanedUrl = cleanUrl(url.trim());
  const type = determineType(cleanedUrl);

  if (!type) {
    return { error: 'Unsupported URL, must be Apple, Spotify, or Castro' };
  }

  // Check if episode already exists
  const existing = await lookupEpisodeByUrl(url);
  if (existing) {
    saveReviewInBackground(existing.id, userId, rating, reviewText);
    return { id: existing.id, slug: existing.slug };
  }

  // New episode — scrape and persist (blocking for manual form,
  // since the user expects to see the episode page after)
  try {
    const scrapedData = await getCachedEpisodeData(type, cleanedUrl);

    if (!scrapedData.episode_name) {
      sendTelegramAlert(
        `⚠️ Scraping returned no episode name for ${type} URL:\n${cleanedUrl}`,
      );
      return { error: 'Episode does not exist or could not be scraped' };
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

    const podcastData = {
      name: scrapedData.podcast_name,
      itunes_id: scrapedData.podcast_itunes_id,
      spotify_id: scrapedData.spotify_show_id,
      genres: scrapedData.podcast_genres,
      rss_feed: scrapedData.rss_feed,
      artist_name: scrapedData.artist_name,
      image_url: scrapedData.image_url,
    };

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
    revalidateTag(`podcast-details:${podcastId}`);
    revalidateTag(`podcast-metadata:${podcastId}`);
    revalidateTag('search-episodes');

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

    revalidateTag(`episode-details:${episode.id}`);
    revalidateTag(`episode-metadata:${episode.id}`);

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

    saveReviewInBackground(episode.id, userId, rating, reviewText);

    return { id: episode.id, slug };
  } catch (error) {
    console.error('Error processing episode:', error);
    sendTelegramAlert(
      `⚠️ Processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
    );
    return { error: 'Error processing episode' };
  }
}
