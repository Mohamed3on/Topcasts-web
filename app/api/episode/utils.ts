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
    //podcasts.apple.com/us/podcast/how-to-convince-biden-to-quit/id1743213122?i=1000661794526
    const podcastId = urlString.match(/id(\d+)/)?.[1];
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
  const html = await getHtml(url);
  const $ = await getCheerio(html);

  const podcastId = url.match(/id(\d+)/)?.[1];
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

  const image_url = contentContainer
    .find('source[type="image/jpeg"]')
    ?.attr('srcset')
    ?.split(',')
    ?.pop()
    ?.trim()
    ?.split(' ')[0];

  const returnObject = {
    episode_name,
    podcast_name,
    podcast_itunes_id: podcastId,
    episode_itunes_id: episodeId,
    description,
    date_published: processDateString(date_published_string),
    duration: durationInMilliseconds,
    image_url,
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
  const itunesId = pocketCastsLink?.split('/').pop();

  // find the href of the parent element of the img whose alt contains Rss
  const rss_feed = $('img[alt*="RSS"]').parent().attr('href');

  // <source inside of the audio tag
  const audio_url = $('audio source').attr('src');

  // second h2 is the date published
  // third h2 is the duration
  const date_published = $('h2').eq(1).text();
  const formatted_duration = $('h2').eq(2).text();
  const duration = convertToMilliseconds(formatted_duration);

  // inside of #artwork-container
  const image_url = $('#artwork-container img').attr('src');

  const returnObject = {
    episode_name,
    description,
    podcast_name,
    image_url: image_url || null,
    duration,
    date_published,
    podcast_itunes_id: itunesId,
    rss_feed,
    audio_url,
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
