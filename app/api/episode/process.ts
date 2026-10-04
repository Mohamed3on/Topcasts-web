import { revalidateTag } from 'next/cache';

import { supabaseAdmin } from '@/utils/supabase/server';
import {
  cleanUrl,
  fetchAppleFeedUrl,
  slugifyDetails,
  toPodcastData,
  EpisodeType,
} from './utils';
import { getCachedEpisodeData } from './utils-cached';
import {
  fillEpisode,
  fillPodcast,
  getEpisodeDescriptions,
  getPodcastEpisodes,
  insertEpisode,
  toCandidate,
  toEpisodeFacts,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from './db';
import {
  askJev,
  type EpisodeFacts,
  type FeedItem,
  fetchFeedItems,
  findCodeMatch,
  findFeedGuid,
  isInFeed,
  matchWithJev,
  publishersAgree,
  shortlist,
  showNameKey,
} from './identity';
import { sendTelegramAlert } from '@/utils/telegram';
import { PodcastData, ReviewType, ScrapedEpisodeData } from '@/app/api/types';

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
  // A like/dislike reorders your podcast ranking, so the episode page's rank
  // badge must refresh too — otherwise it drifts from the statistics page.
  revalidateTag('podcast-ranking', 'max');
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
  // Throws 'Episode does not exist or could not be scraped' on an empty scrape
  const scrapedData = await getCachedEpisodeData(type, cleanedUrl);

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
    guid: scrapedData.guid,
    image_url: scrapedData.image_url,
    slug,
  };

  const sameShow = await findSameShow(podcastData, toEpisodeFacts(episodeData));
  if (sameShow) console.log(`[identity] show ${sameShow.id} matched by feed`);
  const podcastId = sameShow
    ? await fillPodcast(supabaseAdmin, sameShow, podcastData)
    : await upsertPodcastDetails(supabaseAdmin, podcastData);
  revalidate(`podcast-details:${podcastId}`);
  revalidate(`podcast-metadata:${podcastId}`);
  revalidate('search-episodes');

  const { matchId, guid } = await findExistingEpisode(
    podcastId,
    type,
    cleanedUrl,
    episodeData,
    scrapedData.rss_feed,
  );
  episodeData.guid ??= guid;

  const { data: episode, error: episodeError } = matchId
    ? await fillEpisode(supabaseAdmin, matchId, episodeData)
    : await insertEpisode(supabaseAdmin, episodeData, podcastId);
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

  return { id: episode.id, slug: episode.slug ?? slug };
}

/**
 * A stored show's feed items. A show without a feed, or whose feed lists
 * nothing because it moved hosts (TED's podcasts.ted.com now redirects to a
 * web page), gets the current one from its Apple page — reachable from
 * Workers, unlike Apple's API — and keeps it. (rss_feed is unique, so a feed
 * held by a duplicate podcast row is skipped.)
 */
async function showFeedItems(
  show: { id: number; itunes_id: string | null; rss_feed: string | null },
  storefront = 'us',
): Promise<FeedItem[]> {
  const items = show.rss_feed ? await fetchFeedItems(show.rss_feed) : [];
  if (items.length || !show.itunes_id) return items;
  const feedUrl = await fetchAppleFeedUrl(show.itunes_id, storefront);
  if (!feedUrl || feedUrl === show.rss_feed) return items;
  const moved = await fetchFeedItems(feedUrl);
  if (moved.length)
    await supabaseAdmin
      .from('podcast')
      .update({ rss_feed: feedUrl })
      .eq('id', show.id);
  return moved;
}

/**
 * The stored show a share belongs to when it isn't stored under this app's
 * ID or the share's feed yet. Apps name shows differently ("The Official
 * Saastr Podcast" on Spotify, "The Official SaaStr Podcast: SaaS | Founders |
 * Investors" on Apple), which the upsert's exact-name match misses. A show by
 * the same publisher with the same name before any subtitle counts only when
 * a feed confirms it — the shared episode is in the stored show's feed, or a
 * stored episode is in the shared show's — so "The Rest Is Politics: US"
 * never joins "The Rest Is Politics".
 */
export async function findSameShow(podcast: PodcastData, episode: EpisodeFacts) {
  const ids = (['itunes_id', 'spotify_id', 'castro_id'] as const).filter(
    (k) => podcast[k],
  );
  const known = await Promise.all(
    [...ids, ...(podcast.rss_feed ? (['rss_feed'] as const) : [])].map((k) =>
      supabaseAdmin.from('podcast').select('id').eq(k, podcast[k]!).limit(1),
    ),
  );
  if (!ids.length || known.some(({ data }) => data?.length)) return undefined;

  let query = supabaseAdmin
    .from('podcast')
    .select(
      'id, name, artist_name, itunes_id, spotify_id, castro_id, rss_feed, image_url, genres',
    );
  for (const k of ids) query = query.is(k, null);
  const { data: shows } = await query;
  const key = showNameKey(podcast.name);
  const named = (shows ?? []).filter(
    (show) =>
      key &&
      showNameKey(show.name) === key &&
      publishersAgree(show.artist_name, podcast.artist_name),
  );
  if (!named.length) return undefined;

  const sharedFeed = podcast.rss_feed
    ? await fetchFeedItems(podcast.rss_feed)
    : null;
  for (const show of named) {
    if (sharedFeed) {
      const { data: stored } = await getPodcastEpisodes(supabaseAdmin, show.id);
      if (stored?.some((e) => isInFeed(sharedFeed, toCandidate(e))))
        return show;
    } else if (isInFeed(await showFeedItems(show), episode)) return show;
  }
  return undefined;
}

/**
 * The stored episode a newly shared one is the same recording as, if any —
 * by feed GUID, then cleaned title, then Jev on a shortlist — plus the GUID
 * found in the show's feed. Read-only apart from remembering a feed URL.
 */
export async function findExistingEpisode(
  podcastId: number,
  type: EpisodeType,
  cleanedUrl: string,
  episodeData: ScrapedEpisodeData,
  scrapedFeedUrl?: string,
): Promise<{ matchId?: number; guid?: string | null }> {
  const [{ data: rows }, { data: podcast }] = await Promise.all([
    getPodcastEpisodes(supabaseAdmin, podcastId),
    supabaseAdmin
      .from('podcast')
      .select('name, itunes_id, rss_feed')
      .eq('id', podcastId)
      .single(),
  ]);
  const episode = toEpisodeFacts(episodeData);

  if (!episode.guid) {
    // Spotify pages don't link the feed; the stored one serves them.
    const items = scrapedFeedUrl
      ? await fetchFeedItems(scrapedFeedUrl)
      : podcast
        ? await showFeedItems(
            { id: podcastId, ...podcast },
            cleanedUrl.match(/apple\.com\/([a-z]{2})\//)?.[1],
          )
        : [];
    episode.guid = findFeedGuid(items, episode);
  }

  const candidates = (rows ?? []).map(toCandidate);
  const byCode = findCodeMatch(episode, candidates);
  if (byCode) {
    console.log(`[identity] episode ${byCode.id} matched by code`);
    return { matchId: byCode.id, guid: episode.guid };
  }

  const shortlisted = shortlist(episode, candidates, { type, url: cleanedUrl });
  if (shortlisted.length && process.env.TYPESAFE_API_KEY) {
    const { data: described } = await getEpisodeDescriptions(
      supabaseAdmin,
      shortlisted.map((c) => c.id),
    );
    const descriptions = new Map(described?.map((d) => [d.id, d.description]));
    const byJev = await matchWithJev(
      episode,
      shortlisted.map((c) => ({ ...c, description: descriptions.get(c.id) })),
      askJev,
      { podcast: podcast?.name },
    );
    if (byJev) {
      console.log(`[identity] episode ${byJev.id} matched by Jev`);
      return { matchId: byJev.id, guid: episode.guid };
    }
  }
  return { guid: episode.guid };
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
