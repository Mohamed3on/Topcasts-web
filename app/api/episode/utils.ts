import { getSpotifyEpisodeData } from '@/app/api/episode/spotify';
import { load } from 'cheerio';
import slugify from 'slugify';

export function formatUrls(
  urlsArray: { url: string; type: string }[],
): Record<string, string> {
  return urlsArray.reduce(
    (acc, { type, url }) => ({ ...acc, [type]: url }),
    {},
  );
}
export const cleanUrl = (urlString: string) => {
  // apple podcasts
  if (urlString.includes('i=')) {
    const podcastId =
      urlString.match(/id(\d+)/)?.[1] ||
      urlString.split('/').pop()?.split('?')[0];

    const episodeId = urlString.match(/i=(\d+)/)?.[1];
    return `https://podcasts.apple.com/us/podcast/${podcastId}?i=${episodeId}`;
  }

  const url = new URL(urlString);

  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '');

  return `${url.origin}${url.pathname}`;
};

export const getCheerio = async (html: string) => {
  try {
    return load(html);
  } catch (error) {
    throw new Error('Failed to load HTML');
  }
};

export async function scrapeDataByType(
  type: 'apple' | 'spotify' | 'castro',
  url: string,
) {
  switch (type) {
    case 'apple':
      return await scrapeApplePodcastsEpisodeDetails(url);
    case 'castro':
      return await scrapeCastroEpisodeDetails(url);
    case 'spotify':
      return await getSpotifyEpisodeData(url.split('/').pop()!);
  }
}

export async function scrapeApplePodcastsEpisodeDetails(url: string) {
  const { podcastId: extractedPodcastId } =
    extractApplePodcastInfoFromLink(url);

  const [html, metadata] = await Promise.all([
    getHtml(url),
    extractedPodcastId
      ? fetchApplePodcastMetadata(extractedPodcastId)
      : Promise.resolve(null),
  ]);

  const $ = await getCheerio(html);

  const podcastId =
    extractedPodcastId ||
    url.match(/id(\d+)/)?.[1] ||
    url.match(/\/podcast\/(\d+)/)?.[1];
  const episodeId = url.match(/i=(\d+)/)?.[1];

  const contentContainer = $('.content-container');

  const episode_name = contentContainer.find('.headings__title').text().trim();
  const podcast_name = contentContainer
    .find('.subtitle-action a')
    .text()
    .trim();

  const description = contentContainer.find('.paragraph-wrapper').html();

  const informationList = $('[data-testid="information"]');

  const date_published_string = informationList
    .find('li:contains("Published")')
    .find('.content')
    .text()
    .trim();

  const duration_string = informationList
    .find('li:contains("Length")')
    .find('.content')
    .text()
    .trim();

  const durationInMilliseconds = convertAppleDurationToMs(duration_string);

  let image_url = contentContainer
    .find('source[type="image/jpeg"]')
    ?.attr('srcset')
    ?.split(',')
    ?.pop()
    ?.trim()
    ?.split(' ')[0];

  // Try to get artist name from JSON-LD schema
  let artist_name: string | undefined = metadata?.artistName;
  const schemaScript = $('script[id="schema:episode"]');
  if (schemaScript.length > 0) {
    try {
      const schemaData = JSON.parse(schemaScript.html() || '{}');
      artist_name = schemaData.productionCompany ?? artist_name;
    } catch (e) {
      // If JSON parsing fails, artist_name remains undefined
    }
  }

  if (!image_url && metadata?.artworkUrl) {
    image_url = metadata.artworkUrl;
  }

  const returnObject = {
    episode_name,
    podcast_name,
    podcast_itunes_id: podcastId,
    episode_itunes_id: episodeId,
    description,
    date_published: processDateString(date_published_string),
    duration: durationInMilliseconds,
    image_url,
    artist_name,
    rss_feed: metadata?.rssFeed,
    podcast_genres: metadata?.genres,
  };

  return returnObject;
}

export function convertAppleDurationToMs(duration: string): number {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m/i);

  let totalMs = 0;

  if (hours) {
    totalMs += parseInt(hours[1]) * 60 * 60 * 1000;
  }

  if (minutes) {
    totalMs += parseInt(minutes[1]) * 60 * 1000;
  }

  return totalMs;
}

export async function scrapeCastroEpisodeDetails(url: string) {
  const html = await getHtml(url);
  const $ = await getCheerio(html);

  const episode_name = $('h1').first().text();
  if (episode_name === '404') {
    throw new Error('Episode not found');
  }
  const podcast_name = $('h2').first().text();
  const description = $('.co-supertop-castro-show-notes').html();

  const pocketCastsLink = $('a[href*="pca.st"]').attr('href');
  let podcastItunesId = pocketCastsLink?.split('/').pop();

  // find the href of the parent element of the img whose alt contains Rss
  let rss_feed = $('img[alt*="RSS"]').parent().attr('href') || undefined;

  // <source inside of the audio tag
  const audio_url = $('audio source').attr('src');

  // second h2 is the date published
  // third h2 is the duration
  const date_published = $('h2').eq(1).text();
  const formatted_duration = $('h2').eq(2).text();
  const duration = convertToMilliseconds(formatted_duration);

  // inside of #artwork-container
  let image_url = $('#artwork-container img').attr('src');

  let artist_name: string | undefined;
  let episode_itunes_id: string | undefined;
  let podcast_genres: string[] | undefined;

  const appleEpisodeLink = $(
    'a[href*="podcasts.apple.com"], a[href*="itunes.apple.com"]',
  ).attr('href');
  if (appleEpisodeLink) {
    const normalizedAppleUrl = cleanUrl(appleEpisodeLink);
    const { podcastId } = extractApplePodcastInfoFromLink(normalizedAppleUrl);

    if (podcastId) {
      podcastItunesId = podcastItunesId ?? podcastId;

      try {
        const metadata = await fetchApplePodcastMetadata(podcastId);

        if (metadata) {
          artist_name = metadata.artistName ?? artist_name;
          if (!image_url && metadata.artworkUrl) {
            image_url = metadata.artworkUrl;
          }
          rss_feed = rss_feed ?? metadata.rssFeed ?? undefined;
          podcast_genres = metadata.genres ?? podcast_genres;
        }
      } catch (error) {
        console.warn(
          '[scrapeCastroEpisodeDetails] Failed to fetch Apple metadata',
          error,
        );
      }
    }

    // Castro pages typically link to the podcast feed, not a specific episode,
    // so we intentionally leave `episode_itunes_id` undefined here.
  }

  const returnObject = {
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

  return returnObject;
}

function convertToMilliseconds(duration: string): number {
  // First, try to parse as HH:MM:SS format
  const timeparts = duration.split(':').map(Number);
  if (timeparts.length === 3) {
    return (timeparts[0] * 3600 + timeparts[1] * 60 + timeparts[2]) * 1000;
  }
  if (timeparts.length === 2) {
    return (timeparts[0] * 60 + timeparts[1]) * 1000;
  }

  // If not in HH:MM:SS format, use the existing logic
  const timeUnits: { [key: string]: number } = {
    h: 3600000,
    m: 60000,
    s: 1000,
  };

  const regex = /(\d+)\s*([hms])/gi;
  let match: RegExpExecArray | null;
  let totalMilliseconds = 0;

  while ((match = regex.exec(duration)) !== null) {
    const [, value, unit] = match;
    totalMilliseconds += parseInt(value) * (timeUnits[unit.toLowerCase()] || 0);
  }

  return totalMilliseconds;
}

type ApplePodcastMetadata = {
  artistName?: string;
  artworkUrl?: string;
  rssFeed?: string;
  genres?: string[];
};

function extractApplePodcastInfoFromLink(urlString: string) {
  try {
    const parsedUrl = new URL(urlString);
    const idMatch = urlString.match(/id(\d+)/);

    return {
      podcastId: idMatch?.[1],
    };
  } catch (_error) {
    return {
      podcastId: undefined,
    };
  }
}

async function fetchApplePodcastMetadata(
  podcastId: string,
): Promise<ApplePodcastMetadata | null> {
  try {
    const params = new URLSearchParams({
      id: podcastId,
      media: 'podcast',
    });

    const response = await fetch(
      `https://itunes.apple.com/lookup?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`Lookup request failed with status ${response.status}`);
    }

    const json = await response.json();
    const result = Array.isArray(json?.results) ? json.results[0] : null;

    if (!result) {
      return null;
    }

    const artworkUrl =
      result.artworkUrl1000 ??
      result.artworkUrl600 ??
      result.artworkUrl512 ??
      result.artworkUrl160 ??
      result.artworkUrl100;

    const genres = Array.isArray(result.genres)
      ? result.genres.filter(
          (genre: unknown): genre is string => typeof genre === 'string',
        )
      : undefined;

    return {
      artistName: result.artistName ?? result.collectionArtistName,
      artworkUrl,
      rssFeed: typeof result.feedUrl === 'string' ? result.feedUrl : undefined,
      genres,
    };
  } catch (error) {
    console.warn(
      `[fetchApplePodcastMetadata] Failed to fetch metadata for podcast ${podcastId}`,
      error,
    );
    return null;
  }
}

export async function getHtml(url: string): Promise<string> {
  const response = await fetch(url, { method: 'GET' });
  return await response.text();
}

export function slugifyDetails(
  episode_name: string,
  podcast_name: string,
): string {
  return slugify(`${podcast_name} ${episode_name}`, {
    lower: true,
    strict: true,
  });
}

export function determineType(
  urlString: string,
): 'apple' | 'spotify' | 'castro' | null {
  const url = new URL(urlString);

  if (
    url.hostname.includes('podcasts.apple.com') &&
    url.searchParams.get('i')
  ) {
    return 'apple';
  } else if (
    url.hostname.includes('open.spotify.com') &&
    url.pathname.includes('/episode/')
  ) {
    return 'spotify';
  } else if (
    url.hostname.includes('castro.fm') &&
    url.pathname.includes('/episode/')
  ) {
    return 'castro';
  }
  return null;
}

export function processDateString(dateString: string): string {
  const regex = /^(.*?)\s+at\s+/;
  const match = dateString.match(regex);

  if (!match) {
    return dateString; // Return original string if no match found
  }

  return match[1].trim();
}
