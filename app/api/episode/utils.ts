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

export async function scrapeSpotifyEpisodeDetails(html: string) {
  const $ = await getCheerio(html);

  // parse out application/ld+json
  const jsonScript = $('script[type="application/ld+json"]').html();

  if (!jsonScript) {
    throw new Error('No JSON data found');
  }
  const parsedJson = JSON.parse(jsonScript);

  const episode_name = parsedJson.name;
  const podcast_name = $('[data-testid=entity-header-entity-subtitle]').text();
  const description = parsedJson?.description;
  const date_published = parsedJson?.datePublished;
  const formatted_duration = $(
    '[data-testid=episode-progress-not-played]',
  ).text();

  const show_Id = $('meta[name="music:album"]')
    ?.attr('content')
    ?.split('/')
    .pop();

  const episodeImage = $('[data-testid=entity-header-entity-image]').attr(
    'src',
  );

  const returnObject = {
    episode_name,
    description,
    podcast_name,
    duration: convertToMilliseconds(formatted_duration),
    date_published,
    image_url: episodeImage || null,
    spotify_show_id: show_Id,
  };

  return returnObject;
}
export async function scrapeApplePodcastsEpisodeDetails(url: string) {
  const html = await getHtml(url);
  const $ = await getCheerio(html);

  const jsonData = $('script#shoebox-media-api-cache-amp-podcasts').html();
  if (!jsonData) {
    throw new Error('No JSON data found');
  }
  try {
    const parsedJson = JSON.parse(jsonData);

    let episodeData;

    const key = Object.keys(parsedJson).find((key) => key.includes('episodes'));

    if (key) {
      episodeData = JSON.parse(parsedJson[key]);
    }

    const episodeInfo = episodeData.d[0];

    const episode_name = episodeInfo.attributes.name;

    const podcast_name =
      episodeInfo.relationships.podcast.data[0].attributes.name;

    const description = episodeInfo.attributes.description.standard;

    const genres =
      episodeInfo.relationships.podcast.data[0].attributes.genreNames;

    const image_url = episodeInfo.attributes.artwork.url
      .replace('{w}', '400')
      .replace('{h}', '400')
      .replace('{f}', 'png');

    const podcast_itunes_id = episodeInfo.relationships.podcast.data[0].id;

    const episode_itunes_id = episodeInfo.id;
    const date_published = episodeInfo.attributes.releaseDateTime;

    const duration = episodeInfo.attributes.durationInMilliseconds;

    const artist_name = episodeInfo.attributes.artist_name;

    const guid = episodeInfo.attributes.guid;

    const rss_feed = episodeInfo.attributes.rssFeedUrl;
    const audio_url = episodeInfo.attributes.assetUrl;

    const returnObject = {
      episode_name,
      description,
      duration,
      podcast_name,
      image_url,
      artist_name,
      guid,
      audio_url,
      podcast_itunes_id,
      episode_itunes_id,
      date_published,
      podcast_genres: genres,
      rss_feed,
    };

    return returnObject;
  } catch (e) {
    console.log(e);
    throw new Error('Failed to parse JSON');
  }
}

function convertToMilliseconds(duration: string): number {
  type TimeUnit = {
    [key: string]: number;
  };

  const timeUnits: TimeUnit = {
    hr: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
  };
  // Regex to match value and unit pairs
  const regex =
    /(\d+)\s*(hr|hour|hours|min|minute|minutes|sec|second|seconds)/g;
  let match: RegExpExecArray | null;
  let totalMilliseconds = 0;

  // Loop through all matches
  while ((match = regex.exec(duration)) !== null) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2];

    if (timeUnits[unit]) {
      totalMilliseconds += numericValue * timeUnits[unit];
    } else {
      throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  return totalMilliseconds;
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
