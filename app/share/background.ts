import { revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { cleanUrl, determineType } from '@/app/api/episode/utils';
import {
  lookupEpisodeByUrl,
  processNewEpisode,
  saveReview,
} from '@/app/api/episode/process';
import { sendTelegramAlert } from '@/utils/telegram';

function revalidateReviewTags(episodeId: number) {
  revalidateTag(`episode-details:${episodeId}`, 'max');
  revalidateTag('search-episodes', 'max');
  revalidateTag('user-podcast-reviews', 'max');
}

/**
 * Save a review after the response is sent. Uses next/server's `after()` so the
 * Next.js request context (needed by revalidateTag) is preserved.
 */
export function saveReviewInBackground(
  episodeId: number,
  userId: string,
  rating: string,
  reviewText?: string,
) {
  after(async () => {
    await saveReview(episodeId, userId, rating, reviewText);
    revalidateReviewTags(episodeId);
  });
}

/**
 * Scrape, persist, and review a new episode after the response is sent.
 * `after()` keeps the Next.js request context so revalidateTag is allowed.
 */
export function processEpisodeInBackground(
  url: string,
  rating: string,
  userId: string,
) {
  after(async () => {
    const cleanedUrl = cleanUrl(url.trim());
    const type = determineType(cleanedUrl);
    if (!type) return;

    try {
      const existing = await lookupEpisodeByUrl(url);
      if (existing) {
        await saveReview(existing.id, userId, rating);
        revalidateReviewTags(existing.id);
        return;
      }

      const { id } = await processNewEpisode(type, cleanedUrl);
      await saveReview(id, userId, rating);
      revalidateReviewTags(id);
    } catch (error) {
      console.error('Background episode processing failed:', error);
      sendTelegramAlert(
        `⚠️ Background processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}
