'use server';

import { createClient } from '@/utils/supabase/ssr';
import { cleanUrl, determineType } from '@/app/api/episode/utils';
import { processNewEpisode, lookupEpisodeByUrl } from '@/app/api/episode/process';
import { sendTelegramAlert } from '@/utils/telegram';
import { saveReviewInBackground } from './background';

// Re-export as server action for PollAndRedirect
export { lookupEpisodeByUrl };

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
    const { id, slug } = await processNewEpisode(type, cleanedUrl);
    saveReviewInBackground(id, userId, rating, reviewText);
    return { id, slug };
  } catch (error) {
    console.error('Error processing episode:', error);
    sendTelegramAlert(
      `⚠️ Processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
    );
    return { error: 'Error processing episode' };
  }
}
