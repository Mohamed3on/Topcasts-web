import { PodcastData, ScrapedEpisodeDetails } from '@/app/api/types';
import { sendTelegramAlert } from '@/utils/telegram';
import { load } from 'cheerio';
import { unstable_cache } from 'next/cache';
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

export async function scrapeDataByType(
  type: EpisodeType,
  url: string,
): Promise<ScrapedEpisodeDetails> {
  switch (type) {
    case 'apple':
      return await scrapeApplePodcastsEpisodeDetails(url);
    case 'castro':
      return await scrapeCastroEpisodeDetails(url);
    case 'spotify':
      return await scrapeSpotifyEpisodeDetails(url);
  }
}

// Wraps `unstable_cache` so a missing Next.js request context (e.g. running
// from a plain bun script) falls back to a direct call instead of throwing.
function cacheInRequest<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  keyParts: string[],
  options: { revalidate: number; tags: string[] },
): (...args: Args) => Promise<R> {
  const cached = unstable_cache(fn, keyParts, options);
  return async (...args) => {
    try {
      return await cached(...args);
    } catch (e) {
      if (e instanceof Error && e.message.includes('incrementalCache missing')) {
        return fn(...args);
      }
      throw e;
    }
  };
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

export function toPodcastData(s: ScrapedEpisodeDetails): PodcastData {
  return {
    // Collapse whitespace so upstream HTML formatting can't fork a podcast row
    name: s.podcast_name.replace(/\s+/g, ' ').trim(),
    itunes_id: s.podcast_itunes_id,
    spotify_id: s.spotify_show_id,
    castro_id: s.castro_id,
    genres: s.podcast_genres,
    rss_feed: s.rss_feed,
    artist_name: s.artist_name,
    image_url: s.image_url,
  };
}

async function getHtml(url: string) {
  const response = await fetch(url, { method: 'GET' });
  return response.text();
}

export type ImageValidationResult = 'valid' | 'invalid' | 'unknown';

export async function validateImageUrl(
  url: string,
): Promise<ImageValidationResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return 'invalid';
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) return 'invalid';

  try {
    const response = await fetch(parsedUrl, {
      headers: {
        Accept: 'image/*',
        Range: 'bytes=0-0',
      },
      signal: AbortSignal.timeout(5_000),
    });
    const contentType = response.headers.get('content-type')?.toLowerCase();
    await response.body?.cancel();

    return response.ok && contentType?.startsWith('image/')
      ? 'valid'
      : 'invalid';
  } catch (error) {
    console.warn(`Unable to validate image URL ${url}:`, error);
    return 'unknown';
  }
}

/** Parse durations like "1h 30m", "45m", "1:30:00", "67 minutes", "4060" (seconds) */
function parseDurationMs(duration: string): number {
  // Bare number (RSS <itunes:duration> is often total seconds)
  if (/^\d+$/.test(duration.trim())) return Number(duration.trim()) * 1000;

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
  podcastName?: string;
  artistName?: string;
  artworkUrl?: string;
  rssFeed?: string;
  genres?: string[];
};

type AppleEpisodeMetadata = {
  episodeName?: string;
  podcastName?: string;
  durationMs?: number;
  releaseDate?: string;
  description?: string;
  artworkUrl?: string;
  audioUrl?: string;
  guid?: string;
};

type AppleLookupResult = {
  kind?: string;
  trackId?: number;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  collectionArtistName?: string;
  artworkUrl1000?: string;
  artworkUrl600?: string;
  artworkUrl512?: string;
  artworkUrl160?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  genres?: unknown[];
  trackTimeMillis?: number;
  releaseDate?: string;
  description?: string;
  shortDescription?: string;
  episodeUrl?: string;
  episodeGuid?: string;
};

type AppleEpisodeSchema = {
  name?: string;
  productionCompany?: string;
  datePublished?: string;
  description?: string;
  duration?: string;
  thumbnailUrl?: string;
  partOfSeries?: {
    name?: string;
  };
};

function extractApplePodcastId(urlString: string): string | undefined {
  return urlString.match(/id(\d+)/)?.[1];
}

function parseApplePodcastResult(r: AppleLookupResult): ApplePodcastMetadata {
  return {
    podcastName: r.collectionName ?? r.trackName,
    artistName: r.artistName ?? r.collectionArtistName,
    artworkUrl:
      r.artworkUrl1000 ??
      r.artworkUrl600 ??
      r.artworkUrl512 ??
      r.artworkUrl160 ??
      r.artworkUrl100,
    rssFeed: typeof r.feedUrl === 'string' ? r.feedUrl : undefined,
    genres: Array.isArray(r.genres)
      ? r.genres.filter((g: unknown): g is string => typeof g === 'string')
      : undefined,
  };
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

    return parseApplePodcastResult(r);
  } catch (error) {
    console.warn(`[fetchApplePodcastMetadata] Failed for ${podcastId}`, error);
    return null;
  }
}

// Official lookup API: one call returns the podcast object plus its most
// recent episodes (up to 200, bounded by the show's RSS feed window).
async function fetchAppleEpisodeLookup(
  podcastId: string,
  episodeId: string | undefined,
  storefront: string,
): Promise<{
  metadata: ApplePodcastMetadata | null;
  episode: AppleEpisodeMetadata | null;
} | null> {
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${podcastId}&media=podcast&entity=podcastEpisode&limit=200&country=${storefront}`,
    );
    if (!response.ok) {
      // Apple 403s this API from some datacenter IPs (e.g. Cloudflare Workers)
      console.warn(
        `[fetchAppleEpisodeLookup] HTTP ${response.status} for ${podcastId}`,
      );
      return null;
    }

    const json = await response.json();
    const results: AppleLookupResult[] = Array.isArray(json?.results)
      ? json.results
      : [];
    const podcast = results.find((r) => r.kind === 'podcast');
    const episode = episodeId
      ? results.find(
          (r) => r.kind === 'podcast-episode' && String(r.trackId) === episodeId,
        )
      : undefined;

    return {
      metadata: podcast ? parseApplePodcastResult(podcast) : null,
      episode: episode
        ? {
            episodeName: episode.trackName,
            podcastName: episode.collectionName,
            durationMs:
              typeof episode.trackTimeMillis === 'number' &&
              episode.trackTimeMillis > 0
                ? episode.trackTimeMillis
                : undefined,
            releaseDate: episode.releaseDate,
            description: episode.description ?? episode.shortDescription,
            artworkUrl: episode.artworkUrl600 ?? episode.artworkUrl160,
            audioUrl: episode.episodeUrl,
            guid: episode.episodeGuid,
          }
        : null,
    };
  } catch (error) {
    console.warn(`[fetchAppleEpisodeLookup] Failed for ${podcastId}`, error);
    return null;
  }
}

// The podcast page (unlike episode pages) embeds the RSS feed URL in its
// serialized data, and is reachable from datacenter IPs where the lookup
// API is not — it bootstraps the RSS fallback with no other dependency.
async function fetchAppleFeedUrl(
  podcastId: string,
  storefront: string,
): Promise<string | undefined> {
  try {
    const html = await getHtml(
      `https://podcasts.apple.com/${storefront}/podcast/id${podcastId}`,
    );
    const raw = html.match(/"feedUrl":"(https?:[^"]+)"/)?.[1];
    return raw?.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
  } catch (error) {
    console.warn(`[fetchAppleFeedUrl] Failed for ${podcastId}`, error);
    return undefined;
  }
}

type AppleFeedData = {
  episodeName?: string;
  durationMs?: number;
  releaseDate?: string;
  description?: string;
  artworkUrl?: string;
  audioUrl?: string;
  guid?: string;
  podcastName?: string;
  artistName?: string;
  genres?: string[];
};

// The RSS feed is the canonical source (it's what Apple itself ingests) and
// is reachable from everywhere. Matches the episode by feed GUID when known,
// otherwise by the episode slug from the Apple URL (Apple slugs are the
// slugified — possibly truncated — episode title).
async function fetchFeedEpisode(
  feedUrl: string,
  match: { guid?: string; slug?: string },
): Promise<AppleFeedData | null> {
  try {
    const response = await fetch(feedUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn(`[fetchFeedEpisode] HTTP ${response.status} for ${feedUrl}`);
      return null;
    }

    const $ = load(await response.text(), { xmlMode: true });
    const items = $('item').toArray();

    let item = match.guid
      ? items.find(
          (el) => $(el).children('guid').text().trim() === match.guid,
        )
      : undefined;
    if (!item && match.slug) {
      const slugged = items.map((el) => ({
        el,
        slug: slugify($(el).children('title').text().trim(), {
          lower: true,
          strict: true,
        }),
      }));
      const exact = slugged.filter((s) => s.slug === match.slug);
      const prefixed = slugged.filter((s) => s.slug.startsWith(match.slug!));
      // Require an unambiguous match — better to fail loudly than to save
      // the wrong episode's data.
      if (exact.length === 1) item = exact[0].el;
      else if (exact.length === 0 && prefixed.length === 1)
        item = prefixed[0].el;
    }
    if (!item) return null;

    const it = $(item);
    const channel = $('channel').first();
    const categories = channel
      .children('itunes\\:category')
      .map((_, el) => $(el).attr('text'))
      .get()
      .filter((g): g is string => !!g);

    return {
      episodeName: it.children('title').text().trim() || undefined,
      durationMs:
        parseDurationMs(it.children('itunes\\:duration').text().trim()) ||
        undefined,
      releaseDate: it.children('pubDate').text().trim() || undefined,
      description:
        it.children('content\\:encoded').text().trim() ||
        it.children('description').text().trim() ||
        undefined,
      artworkUrl:
        it.children('itunes\\:image').attr('href') ||
        channel.children('itunes\\:image').attr('href') ||
        channel.find('image > url').first().text().trim() ||
        undefined,
      audioUrl: it.children('enclosure').attr('url') || undefined,
      guid: it.children('guid').text().trim() || undefined,
      podcastName: channel.children('title').first().text().trim() || undefined,
      artistName:
        channel.children('itunes\\:author').text().trim() || undefined,
      genres: categories.length ? categories : undefined,
    };
  } catch (error) {
    console.warn(`[fetchFeedEpisode] Failed for ${feedUrl}`, error);
    return null;
  }
}

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n+/)
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');
}

export async function scrapeApplePodcastsEpisodeDetails(url: string) {
  const podcastId = extractApplePodcastId(url);
  const episodeId = url.match(/i=(\d+)/)?.[1];
  const storefront =
    url.match(/podcasts\.apple\.com\/([a-z]{2})\//)?.[1] ?? 'us';
  const urlSlug = url.match(/\/podcast\/([^/]+)\/id\d+/)?.[1];

  // Three independent sources, merged per field:
  //  1. episode page HTML   — richest, but Apple's SSR breaks periodically
  //  2. iTunes lookup API   — official, but 403s from datacenter IPs (CF Workers)
  //  3. RSS feed            — canonical and reachable everywhere; feed URL comes
  //     from the lookup or from the podcast page, which unlike episode pages
  //     stays up during SSR outages
  const [html, lookup] = await Promise.all([
    getHtml(url).catch(() => ''),
    podcastId
      ? fetchAppleEpisodeLookup(podcastId, episodeId, storefront)
      : null,
  ]);
  const metadata = lookup?.metadata ?? null;
  const apiEpisode = lookup?.episode ?? null;

  const $ = load(html);
  const content = $('.content-container');

  let schema: AppleEpisodeSchema = {};
  try {
    schema = JSON.parse(
      $('script[id="schema:episode"]').html() || '{}',
    ) as AppleEpisodeSchema;
  } catch {}

  const pageEpisodeName =
    content.find('.headings__title').text().trim() || schema.name?.trim();
  const pageDescription =
    content.find('.paragraph-wrapper').html() || schema.description || null;

  const info = $('[data-testid="information"]');
  const date_published_string =
    info.find('li:contains("Published")').find('.content').text().trim() ||
    schema.datePublished ||
    '';
  const duration_string =
    info.find('li:contains("Length")').find('.content').text().trim() ||
    schema.duration ||
    '';

  const pageImage =
    content
      .find('source[type="image/jpeg"]')
      ?.attr('srcset')
      ?.split(',')
      ?.pop()
      ?.trim()
      ?.split(' ')[0] || schema.thumbnailUrl;

  // RSS fallback: only when the page + API left a core field unfilled.
  let feed: AppleFeedData | null = null;
  let feedUrl = metadata?.rssFeed;
  const missingCore =
    !(pageEpisodeName || apiEpisode?.episodeName) ||
    !(parseDurationMs(duration_string) || apiEpisode?.durationMs) ||
    !(pageImage || apiEpisode?.artworkUrl) ||
    !(pageDescription || apiEpisode?.description);
  if (missingCore && podcastId && (apiEpisode?.guid || urlSlug)) {
    feedUrl = feedUrl || (await fetchAppleFeedUrl(podcastId, storefront));
    if (feedUrl) {
      feed = await fetchFeedEpisode(feedUrl, {
        guid: apiEpisode?.guid,
        slug: urlSlug,
      });
    }
  }

  const episode_name =
    pageEpisodeName ||
    apiEpisode?.episodeName?.trim() ||
    feed?.episodeName ||
    '';
  const podcast_name =
    schema.partOfSeries?.name?.trim() ||
    apiEpisode?.podcastName?.trim() ||
    metadata?.podcastName?.trim() ||
    feed?.podcastName ||
    (podcastId
      ? content
          .find(`a[href*="/podcast/"][href*="id${podcastId}"]`)
          .first()
          .text()
          .trim()
      : '');

  const description =
    pageDescription ||
    feed?.description ||
    (apiEpisode?.description ? plainTextToHtml(apiEpisode.description) : null);

  const image_url =
    pageImage ||
    apiEpisode?.artworkUrl ||
    feed?.artworkUrl ||
    metadata?.artworkUrl;

  const artist_name =
    schema.productionCompany ?? metadata?.artistName ?? feed?.artistName;

  return {
    episode_name,
    podcast_name,
    podcast_itunes_id: podcastId,
    episode_itunes_id: episodeId,
    description,
    date_published:
      apiEpisode?.releaseDate ??
      (processDateString(date_published_string) || feed?.releaseDate || ''),
    duration:
      apiEpisode?.durationMs ||
      parseDurationMs(duration_string) ||
      feed?.durationMs ||
      null,
    image_url,
    artist_name,
    audio_url: apiEpisode?.audioUrl ?? feed?.audioUrl,
    guid: apiEpisode?.guid ?? feed?.guid,
    rss_feed: feedUrl,
    podcast_genres: metadata?.genres ?? feed?.genres,
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
  const castroShareLink = $('a[href*="castro.fm/share/podcast/"]').attr('href');
  const castro_id = castroShareLink?.match(/castro\.fm\/share\/podcast\/([0-9a-f-]{36})/)?.[1];

  const spans = $('.episode-submeta').find('span').not('.dot');
  const date_published = spans.eq(0).text().trim() || $('h2').eq(1).text();
  const formatted_duration =
    spans.eq(1).text().trim() || ogDuration || $('h2').eq(2).text();
  const duration = parseDurationMs(formatted_duration) || null;

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
    const metadata = await fetchApplePodcastMetadata(applePodcastId);
    if (metadata) {
      artist_name = metadata.artistName ?? artist_name;
      if (metadata.artworkUrl) image_url = metadata.artworkUrl;
      rss_feed = rss_feed ?? metadata.rssFeed ?? undefined;
      podcast_genres = metadata.genres ?? podcast_genres;
    }
  }

  const imageValidation = image_url
    ? await validateImageUrl(image_url)
    : 'invalid';
  const issues = [
    !podcast_name && 'podcast_name',
    !image_url && 'image_url',
    !audio_url && 'audio_url',
    !date_published && 'date_published',
    !duration && !audio_url && 'duration',
    image_url && imageValidation === 'invalid' && `invalid_image(${image_url})`,
  ].filter(Boolean);
  if (issues.length) {
    sendTelegramAlert(
      `⚠️ Castro scraper: issues [${issues.join(', ')}] for:\n${url}`,
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
    castro_id,
    rss_feed,
    audio_url,
    artist_name,
    podcast_genres,
  };
}

// ── Spotify ───────────────────────────────────────────────────────
// Public-page scrape; the Web API now requires Premium on the app owner
// (Spotify dev-mode change, March 2026). Duration + release_date aren't
// exposed in the public HTML; we accept the loss.

type SpotifyShowMetadata = {
  name: string;
  publisher?: string;
  description?: string;
};

const fetchSpotifyShowMetadata = cacheInRequest(
  async (showId: string): Promise<SpotifyShowMetadata | null> => {
    try {
      const html = await getHtml(`https://open.spotify.com/show/${showId}`);
      const $ = load(html);
      const raw = $('script[type="application/ld+json"]').first().html();
      if (!raw) return null;
      const ld = JSON.parse(raw);
      if (!ld?.name) return null;
      return {
        name: ld.name,
        publisher: typeof ld.publisher === 'string' ? ld.publisher : undefined,
        description: typeof ld.description === 'string'
          ? ld.description.replace(/^Listen to .+? on Spotify\.\s*/, '')
          : undefined,
      };
    } catch (error) {
      console.warn(`[fetchSpotifyShowMetadata] Failed for ${showId}`, error);
      return null;
    }
  },
  ['spotify-show-metadata'],
  { revalidate: 30 * 86400, tags: ['spotify-show-metadata'] },
);

function extractSpotifyEpisodeId(urlString: string): string | undefined {
  return urlString.match(/\/episode\/([A-Za-z0-9]+)/)?.[1];
}

export async function scrapeSpotifyEpisodeDetails(url: string) {
  const episodeId = extractSpotifyEpisodeId(url);
  if (!episodeId) throw new Error('Invalid Spotify episode URL');

  const html = await getHtml(`https://open.spotify.com/episode/${episodeId}`);
  const $ = load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  // Title format: "Episode Name - [Podcast Name, EP.N]" — fallback podcast
  // name when the show-page fetch fails.
  const titleMatch = ogTitle.match(/^(.+?)\s*-\s*\[([^,\]]+)(?:,\s*EP\.[^\]]*)?\]\s*$/i);
  const episode_name = titleMatch?.[1]?.trim() || ogTitle.trim();
  const podcastFromTitle = titleMatch?.[2]?.trim();

  if (!episode_name) {
    throw new Error('Episode not found');
  }

  const image_url = $('meta[property="og:image"]').attr('content') || null;
  const audio_url = $('meta[property="og:audio"]').attr('content') || null;
  const spotify_show_id = $('a[href^="/show/"]').attr('href')?.split('/').pop();

  const durationSec = Number($('meta[name="music:duration"]').attr('content'));
  const duration = Number.isFinite(durationSec) && durationSec > 0
    ? durationSec * 1000
    : null;

  let description: string | null = null;
  let date_published: string | null =
    $('meta[name="music:release_date"]').attr('content')?.slice(0, 10) || null;
  const ldRaw = $('script[type="application/ld+json"]').first().html();
  if (ldRaw) {
    try {
      const ld = JSON.parse(ldRaw);
      if (typeof ld?.description === 'string') {
        description = ld.description.replace(
          /^Listen to this episode from .+? on Spotify\.\s*/,
          '',
        );
      }
      if (!date_published && typeof ld?.datePublished === 'string') {
        date_published = ld.datePublished;
      }
    } catch {}
  }

  const show = spotify_show_id
    ? await fetchSpotifyShowMetadata(spotify_show_id)
    : null;

  const podcast_name = show?.name || podcastFromTitle;
  if (!podcast_name) {
    throw new Error('Could not extract podcast name');
  }

  const missing = [
    !image_url && 'image_url',
    !spotify_show_id && 'spotify_show_id',
    !show?.publisher && 'artist_name',
    !duration && 'duration',
    !date_published && 'date_published',
  ].filter(Boolean);
  if (missing.length) {
    sendTelegramAlert(
      `⚠️ Spotify scraper: missing fields [${missing.join(', ')}] for:\n${url}`,
    );
  }

  return {
    episode_name,
    podcast_name,
    description,
    image_url,
    audio_url,
    duration,
    date_published,
    spotify_show_id,
    artist_name: show?.publisher,
  };
}
