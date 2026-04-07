import { getCloudflareContext } from '@opennextjs/cloudflare';
import { revalidateTag } from 'next/cache';

import { cleanUrl, determineType } from '@/app/api/episode/utils';
import {
  lookupEpisodeByUrl,
  processNewEpisode,
  saveReview,
} from '@/app/api/episode/process';
import { sendTelegramAlert } from '@/utils/telegram';

/**
 * Save a review in the background using Cloudflare's waitUntil.
 * Does not block the response.
 */
export function saveReviewInBackground(
  episodeId: number,
  userId: string,
  rating: string,
  reviewText?: string,
) {
  const { ctx } = getCloudflareContext();
  ctx.waitUntil(
    saveReview(episodeId, userId, rating, reviewText).then(() => {
      revalidateTag(`episode-details:${episodeId}`, 'max');
      revalidateTag('search-episodes', 'max');
      revalidateTag('user-podcast-reviews', 'max');
    }),
  );
}

/**
 * Process a new episode entirely in the background using Cloudflare's waitUntil.
 * Scrapes the episode data, creates the podcast/episode/URL records, and saves
 * the review — all after the HTTP response has been sent.
 */
export function processEpisodeInBackground(
  url: string,
  rating: string,
  userId: string,
) {
  const { ctx } = getCloudflareContext();
  ctx.waitUntil(
    (async () => {
      const cleanedUrl = cleanUrl(url.trim());
      const type = determineType(cleanedUrl);
      if (!type) return;

      try {
        // Check if another request already created this episode
        const existing = await lookupEpisodeByUrl(url);
        if (existing) {
          await saveReview(existing.id, userId, rating);
          revalidateTag(`episode-details:${existing.id}`, 'max');
          revalidateTag('search-episodes', 'max');
          revalidateTag('user-podcast-reviews', 'max');
          return;
        }

        // Scrape directly — unstable_cache doesn't work inside waitUntil
        const { id } = await processNewEpisode(type, cleanedUrl, {
          useCache: false,
        });
        await saveReview(id, userId, rating);
        revalidateTag(`episode-details:${id}`, 'max');
        revalidateTag('search-episodes', 'max');
        revalidateTag('user-podcast-reviews', 'max');
      } catch (error) {
        console.error('Background episode processing failed:', error);
        sendTelegramAlert(
          `⚠️ Background processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })(),
  );
}
