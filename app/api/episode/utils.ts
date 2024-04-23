import { load } from 'cheerio';
import { EpisodeDetails } from '../types';
import { createHash } from 'crypto';
import { SupabaseClient, formatUrls } from '@/app/api/episode/route';

const getCheerio = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();
  return load(html);
};

export async function updateEpisodeDetails({
  identifier,
  type,
  cleanedUrl,
  scrapedData,
  supabase,
}: {
  identifier: string;
  type: 'apple' | 'spotify' | 'castro';
  cleanedUrl: string;
  scrapedData: EpisodeDetails;
  supabase: SupabaseClient;
}) {
  // Attempt to upsert episode details
  const { error: episodeError } = await supabase
    .from('episode_details')
    .upsert({ ...scrapedData, id: identifier }, { onConflict: 'id' });

  if (episodeError) {
    console.error('Error upserting episode details:', episodeError);
    return null;
  }

  // Attempt to upsert the URL in the URLs table
  const { error: urlError } = await supabase
    .from('episode_urls')
    .upsert({ url: cleanedUrl, episode_id: identifier, type: type }, { onConflict: 'url' });

  if (urlError) {
    console.error('Error updating URL:', urlError);
    return null;
  }

  // Fetch the updated episode details along with URLs
  const { data: episode, error: fetchError } = await supabase
    .from('episode_details')
    .select(
      `
      *,
      episode_urls (url, type)
    `
    )
    .eq('id', identifier)
    .single();

  if (fetchError) {
    console.error('Error fetching updated episode details:', fetchError);
    return null;
  }

  if (episode) {
    const updatedEpisode: EpisodeDetails = {
      ...episode,
      urls: formatUrls(episode.episode_urls),
    };
    return updatedEpisode;
  }

  return null;
}

export async function scrapeDataByType(type: 'apple' | 'spotify' | 'castro', url: string) {
  switch (type) {
    case 'apple':
      return await scrapeApplePodcastsEpisodeDetails(url);
    case 'spotify':
      return await scrapeSpotifyEpisodeDetails(url);
    case 'castro':
      return await scrapeCastroEpisodeDetails(url);
  }
}

export async function scrapeSpotifyEpisodeDetails(url: string) {
  const $ = await getCheerio(url);

  // parse out application/ld+json
  const jsonScript = $('script[type="application/ld+json"]').html();

  if (!jsonScript) {
    throw new Error('No JSON data found');
  }
  const parsedJson = JSON.parse(jsonScript);

  const episode_name = parsedJson.name;
  const podcast_name = $('[data-testid=entity-header-entity-subtitle]').text();
  const description = parsedJson?.description;
  const date_published = parsedJson?.date_published;
  const duration = $('[data-testid=episode-progress-not-played]').text();

  const episodeImage = $('[data-testid=entity-header-entity-image]').attr('src');

  const returnObject: EpisodeDetails = {
    episode_name,
    description,
    podcast_name,
    formatted_duration: duration,
    date_published,
    image_url: episodeImage || null,
  };

  return returnObject;
}
export async function scrapeApplePodcastsEpisodeDetails(url: string) {
  const $ = await getCheerio(url);

  const jsonData = $('script#shoebox-media-api-cache-amp-podcasts').html();
  if (!jsonData) {
    throw new Error('No JSON data found');
  }

  const parsedJson = JSON.parse(jsonData);

  let episodeData;

  const key = Object.keys(parsedJson).find((key) => key.includes('episodes'));

  if (key) {
    episodeData = JSON.parse(parsedJson[key]);
  }

  const episodeInfo = episodeData.d[0];

  const episode_name = episodeInfo.attributes.name;
  const podcast_name = episodeInfo.relationships.podcast.data[0].attributes.name;
  const description = episodeInfo.attributes.description.standard;
  const image_url = episodeInfo.attributes.artwork.url
    .replace('{w}', '400')
    .replace('{h}', '400')
    .replace('{f}', 'png');

  const podcastiTunesID = episodeInfo.relationships.podcast.data[0].id;

  const episode_itunes_id = episodeInfo.id;

  const duration = episodeInfo.attributes.durationInMilliseconds;

  const artist_name = episodeInfo.attributes.artist_name;

  const guid = episodeInfo.attributes.guid;

  const audio_url = episodeInfo.attributes.assetUrl;

  const returnObject: EpisodeDetails = {
    episode_name,
    description,
    duration,
    podcast_name,
    image_url,
    artist_name,
    guid,
    audio_url,
    podcast_itunes_id: podcastiTunesID,
    episode_itunes_id,
  };

  return returnObject;
}

export async function scrapeCastroEpisodeDetails(url: string) {
  const $ = await getCheerio(url);

  const episode_name = $('h1').text();
  const podcast_name = $('h2').eq(0).text();
  const description = $('.co-supertop-castro-show-notes').html();

  // second h2 is the date published
  // third h2 is the duration
  const date_published = $('h2').eq(1).text();
  const formatted_duration = $('h2').eq(2).text();

  // inside of #artwork-container
  const image_url = $('#artwork-container img').attr('src');

  const returnObject: EpisodeDetails = {
    episode_name,
    description,
    podcast_name,
    image_url: image_url || null,
    formatted_duration,
    date_published,
  };

  return returnObject;
}
export function parseAndCleanUrl(
  url: string
): { cleanedUrl: string; type: 'apple' | 'spotify' | 'castro' | null } | null {
  try {
    const urlObject = new URL(url);
    if (urlObject.hostname.includes('podcasts.apple.com')) {
      const i = urlObject.searchParams.get('i');
      if (i) {
        return {
          cleanedUrl: `https://podcasts.apple.com${urlObject.pathname}?i=${i}`,
          type: 'apple',
        };
      }
    } else if (
      urlObject.hostname.includes('open.spotify.com') &&
      urlObject.pathname.includes('/episode/')
    ) {
      return { cleanedUrl: `https://open.spotify.com${urlObject.pathname}`, type: 'spotify' };
    } else if (
      urlObject.hostname.includes('castro.fm') &&
      urlObject.pathname.includes('/episode/')
    ) {
      return { cleanedUrl: `https://castro.fm${urlObject.pathname}`, type: 'castro' };
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
  return null;
}

export function createIdentifierFromDetails(episode_name: string, podcast_name: string): string {
  // Normalize the input
  const normalizedEpisodeName = normalizeString(episode_name);
  const normalizedPodcastName = normalizeString(podcast_name);

  // Concatenate normalized strings
  const concatenatedDetails = `${normalizedPodcastName}-${normalizedEpisodeName}`;

  // Hash the concatenated string using SHA-256
  return hashString(concatenatedDetails);
}
function normalizeString(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/gi, '');
}
function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
