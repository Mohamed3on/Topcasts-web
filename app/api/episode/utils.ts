import { getSpotifyEpisodeData } from '@/app/api/episode/spotify';
import { sendTelegramAlert } from '@/utils/telegram';
import { load } from 'cheerio';
import slugify from 'slugify';

// ── Shared utilities ──────────────────────────────────────────────

export type EpisodeType = 'apple' | 'spotify' | 'castro';

export function determineType(urlString: string): EpisodeType | null {
  const url = new URL(urlString);
  if (url.hostname === 'podcasts.apple.com' && url.searchParams.get('i'))
    return 'apple';
  if (url.hostname === 'open.spotify.com' && url.pathname.includes('/episode/'))
    return 'spotify';
  if (url.hostname === 'castro.fm' && url.pathname.includes('/episode/'))
    return 'castro';
  return null;
}

export const cleanUrl = (urlString: string) => {
  const url = new URL(urlString);
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '');

  // Apple Podcasts: preserve full path (slug required to avoid redirect) + only ?i=
  const episodeId = url.searchParams.get('i');
  if (url.hostname === 'podcasts.apple.com' && episodeId) {
    return `${url.origin}${url.pathname}?i=${episodeId}`;
  }

  return `${url.origin}${url.pathname}`;
};

export async function scrapeDataByType(type: EpisodeType, url: string) {
  switch (type) {
    case 'apple':
      return await scrapeApplePodcastsEpisodeDetails(url);
    case 'castro':
      return await scrapeCastroEpisodeDetails(url);
    case 'spotify':
      return await getSpotifyEpisodeData(url.split('/').pop()!);
  }
}

export function slugifyDetails(episode_name: string, podcast_name: string) {
  return slugify(`${podcast_name} ${episode_name}`, {
    lower: true,
    strict: true,
  });
}

export function formatUrls(
  urlsArray: { url: string; type: string }[],
): Record<string, string> {
  return urlsArray.reduce(
    (acc, { type, url }) => ({ ...acc, [type]: url }),
    {},
  );
}

async function getHtml(url: string) {
  const response = await fetch(url, { method: 'GET' });
  return response.text();
}

/** Parse durations like "1h 30m", "45m", "1:30:00", "67 minutes" */
function parseDurationMs(duration: string): number {
  // HH:MM:SS or MM:SS
  const parts = duration.split(':').map(Number);
  if (parts.length === 3)
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;

  // "1h 30m 15s" / "67 minutes" / "45m"
  const units: Record<string, number> = { h: 3600000, m: 60000, s: 1000 };
  let ms = 0;
  let match: RegExpExecArray | null;
  const regex = /(\d+)\s*([hms])/gi;
  while ((match = regex.exec(duration)) !== null) {
    ms += parseInt(match[1]) * (units[match[2].toLowerCase()] || 0);
  }
  return ms;
}

// Strips " at HH:MM AM" suffix from Apple date strings
export function processDateString(dateString: string): string {
  return dateString.replace(/\s+at\s+.*$/, '').trim() || dateString;
}

// ── Apple Podcasts ────────────────────────────────────────────────

type ApplePodcastMetadata = {
  artistName?: string;
  artworkUrl?: string;
  rssFeed?: string;
  genres?: string[];
};

function extractApplePodcastId(urlString: string): string | undefined {
  return urlString.match(/id(\d+)/)?.[1];
}

async function fetchApplePodcastMetadata(
  podcastId: string,
): Promise<ApplePodcastMetadata | null> {
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${podcastId}&media=podcast`,
    );
    if (!response.ok) return null;

    const json = await response.json();
    const r = Array.isArray(json?.results) ? json.results[0] : null;
    if (!r) return null;

    return {
      artistName: r.artistName ?? r.collectionArtistName,
      artworkUrl:
        r.artworkUrl1000 ?? r.artworkUrl600 ?? r.artworkUrl512 ??
        r.artworkUrl160 ?? r.artworkUrl100,
      rssFeed: typeof r.feedUrl === 'string' ? r.feedUrl : undefined,
      genres: Array.isArray(r.genres)
        ? r.genres.filter((g: unknown): g is string => typeof g === 'string')
        : undefined,
    };
  } catch (error) {
    console.warn(`[fetchApplePodcastMetadata] Failed for ${podcastId}`, error);
    return null;
  }
}

export async function scrapeApplePodcastsEpisodeDetails(url: string) {
  const podcastId = extractApplePodcastId(url);

  const [html, metadata] = await Promise.all([
    getHtml(url),
    podcastId ? fetchApplePodcastMetadata(podcastId) : null,
  ]);

  const $ = load(html);
  const content = $('.content-container');

  const episode_name = content.find('.headings__title').text().trim();
  const podcast_name = content.find('.subtitle-action a').text().trim();
  const description = content.find('.paragraph-wrapper').html();

  const info = $('[data-testid="information"]');
  const date_published_string = info
    .find('li:contains("Published")').find('.content').text().trim();
  const duration_string = info
    .find('li:contains("Length")').find('.content').text().trim();

  let image_url = content
    .find('source[type="image/jpeg"]')
    ?.attr('srcset')?.split(',')?.pop()?.trim()?.split(' ')[0];

  let artist_name: string | undefined = metadata?.artistName;
  try {
    const schema = JSON.parse($('script[id="schema:episode"]').html() || '{}');
    artist_name = schema.productionCompany ?? artist_name;
  } catch {}

  if (!image_url && metadata?.artworkUrl) {
    image_url = metadata.artworkUrl;
  }

  return {
    episode_name,
    podcast_name,
    podcast_itunes_id: podcastId,
    episode_itunes_id: url.match(/i=(\d+)/)?.[1],
    description,
    date_published: processDateString(date_published_string),
    duration: parseDurationMs(duration_string),
    image_url,
    artist_name,
    rss_feed: metadata?.rssFeed,
    podcast_genres: metadata?.genres,
  };
}

// ── Castro ────────────────────────────────────────────────────────

export async function scrapeCastroEpisodeDetails(url: string) {
  const html = await getHtml(url);
  const $ = load(html);

  // OG meta tags — most stable (breaking these breaks social previews)
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');

  // og:title format: "Podcast Name: Episode Name (1h7m)"
  const lastColon = ogTitle.lastIndexOf(':');
  const ogPodcastName = lastColon > 0 ? ogTitle.slice(0, lastColon).trim() : '';
  const ogEpisodeRest = lastColon > 0 ? ogTitle.slice(lastColon + 1).trim() : ogTitle;
  const ogEpisodeName = ogEpisodeRest.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const ogDuration = ogEpisodeRest.match(/\(([^)]+)\)\s*$/)?.[1];

  // HTML selectors with OG fallbacks
  const episode_name =
    $('.title.episode-title').first().text().trim() ||
    $('h1').first().text().trim() ||
    ogEpisodeName;
  if (!episode_name || episode_name === '404') {
    throw new Error('Episode not found');
  }

  const podcast_name =
    $('.episode-podcast-link').first().text().trim() ||
    $('h2').first().text().trim() ||
    ogPodcastName;

  const description =
    $('.co-supertop-castro-show-notes').first().html() || ogDescription || null;

  // Functional elements (stable — links/media, not presentation)
  const audio_url = $('audio source').attr('src');
  let podcastItunesId = $('a[href*="pca.st"]').attr('href')?.split('/').pop();
  let rss_feed = $('img[alt*="RSS"]').parent().attr('href') || undefined;

  const spans = $('.episode-submeta').find('span').not('.dot');
  const date_published = spans.eq(0).text().trim() || $('h2').eq(1).text();
  const formatted_duration =
    spans.eq(1).text().trim() || ogDuration || $('h2').eq(2).text();
  const duration = parseDurationMs(formatted_duration);

  let image_url = ogImage ||
    $('img.artwork-main').attr('src') ||
    $('img.episode-artwork-main').attr('src');

  let artist_name: string | undefined;
  let episode_itunes_id: string | undefined;
  let podcast_genres: string[] | undefined;

  // Enrich from Apple metadata
  const appleLink = $(
    'a[href*="podcasts.apple.com"], a[href*="itunes.apple.com"]',
  ).attr('href');
  const applePodcastId = appleLink
    ? extractApplePodcastId(cleanUrl(appleLink))
    : /^\d+$/.test(podcastItunesId ?? '') ? podcastItunesId : undefined;
  if (applePodcastId) {
    podcastItunesId = podcastItunesId ?? applePodcastId;
    try {
      const metadata = await fetchApplePodcastMetadata(applePodcastId);
      if (metadata) {
        artist_name = metadata.artistName ?? artist_name;
        if (metadata.artworkUrl) image_url = metadata.artworkUrl;
        rss_feed = rss_feed ?? metadata.rssFeed ?? undefined;
        podcast_genres = metadata.genres ?? podcast_genres;
      }
    } catch (error) {
      console.warn('[scrapeCastroEpisodeDetails] Apple metadata fetch failed', error);
    }
  }

  // Alert on missing or unreliable fields to catch issues early
  const isReliableImage = image_url && /mzstatic\.com|scdn\.co|megaphone|simplecastcdn|art19\.com|libsyn\.com|transistorcdn\.com|pippa\.io|substackcdn|cloudfront\.net|buzzsprout|captivate\.fm|omnycontent/.test(image_url);
  const missing = [
    !podcast_name && 'podcast_name',
    !image_url && 'image_url',
    !audio_url && 'audio_url',
    !date_published && 'date_published',
    !duration && 'duration',
    (image_url && !isReliableImage) && `unreliable_image(${image_url})`,
  ].filter(Boolean);
  if (missing.length) {
    sendTelegramAlert(
      `⚠️ Castro scraper: missing fields [${missing.join(', ')}] for:\n${url}`,
    );
  }

  return {
    episode_name,
    description,
    podcast_name,
    image_url: image_url || null,
    duration,
    date_published,
    podcast_itunes_id: podcastItunesId,
    episode_itunes_id,
    rss_feed,
    audio_url,
    artist_name,
    podcast_genres,
  };
}
