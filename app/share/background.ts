import { revalidateTag } from 'next/cache';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { supabaseAdmin } from '@/utils/supabase/server';
import {
  cleanUrl,
  determineType,
  scrapeDataByType,
  slugifyDetails,
} from '@/app/api/episode/utils';
import {
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from '@/app/api/episode/db';
import { sendTelegramAlert } from '@/utils/telegram';
import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '@/app/api/types';

function tryRevalidate(tag: string) {
  try {
    revalidateTag(tag);
  } catch {
    // revalidateTag may not work inside waitUntil (no Next.js request context)
  }
}

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
    supabaseAdmin
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
        if (error) console.error('Background review upsert failed:', error);
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
        const { data: existingUrl } = await supabaseAdmin
          .from('podcast_episode_url')
          .select('episode_id')
          .eq('url', cleanedUrl)
          .single();

        if (existingUrl?.episode_id) {
          // Episode was created by another request — just save the review
          await supabaseAdmin
            .from('podcast_episode_review')
            .upsert(
              {
                episode_id: existingUrl.episode_id,
                user_id: userId,
                review_type: rating,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id, episode_id' },
            );
          return;
        }

        // Scrape directly — unstable_cache doesn't work inside waitUntil
        const scrapedData = (await scrapeDataByType(type, cleanedUrl)) as ScrapedEpisodeDetails;

        if (!scrapedData.episode_name) {
          sendTelegramAlert(
            `⚠️ Background scraping returned no episode name for ${type} URL:\n${cleanedUrl}`,
          );
          return;
        }

        if (!scrapedData.image_url) {
          sendTelegramAlert(
            `⚠️ Background scraping returned no image for ${type} URL:\n${cleanedUrl}\nEpisode: ${scrapedData.episode_name}`,
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

        // Sequential DB writes (each depends on the previous)
        const podcastId = await upsertPodcastDetails(
          supabaseAdmin,
          podcastData,
        );
        tryRevalidate(`podcast-details:${podcastId}`);
        tryRevalidate(`podcast-metadata:${podcastId}`);
        tryRevalidate('search-episodes');

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

        tryRevalidate(`episode-details:${episode.id}`);
        tryRevalidate(`episode-metadata:${episode.id}`);

        // URL insert and review can run in parallel — both only need episode.id
        const [urlResult] = await Promise.all([
          upsertEpisodeUrl(supabaseAdmin, cleanedUrl, episode.id, type),
          supabaseAdmin.from('podcast_episode_review').upsert(
            {
              episode_id: episode.id,
              user_id: userId,
              review_type: rating,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id, episode_id' },
          ),
        ]);

        if (urlResult.error) {
          throw new Error(
            `Failed to upsert episode URL: ${JSON.stringify(urlResult.error)}`,
          );
        }
      } catch (error) {
        console.error('Background episode processing failed:', error);
        sendTelegramAlert(
          `⚠️ Background processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })(),
  );
}
