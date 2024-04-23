import { load } from 'cheerio';
import { EpisodeDetails } from '../types';
import { SupabaseClient } from '@/app/api/episode/route';
import slugify from 'slugify';

export function formatUrls(urlsArray: { url: string; type: string }[]): Record<string, string> {
  return urlsArray.reduce((acc, { type, url }) => ({ ...acc, [type]: url }), {});
}

const getCheerio = async (url: string) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    return load(html);
  } catch (error) {
    console.error('Error loading HTML from URL:', error);
    throw new Error('Failed to load HTML');
  }
};

export async function updateEpisodeDetails({
  type,
  cleanedUrl,
  scrapedData,
  supabase,
}: {
  type: 'apple' | 'spotify' | 'castro';
  cleanedUrl: string;
  scrapedData: EpisodeDetails;
  supabase: SupabaseClient;
}): Promise<EpisodeDetails | null> {
  try {
    const slug = slugifyDetails(scrapedData.episode_name, scrapedData.podcast_name);

    // Check if episode exists by slug
    let { data: existingData, error: findError } = await supabase
      .from('episode_details')
      .select('id')
      .eq('slug', slug)
      .single();

    if (findError && findError.message !== 'No rows found') throw findError;

    let episodeId = existingData ? existingData.id : null;

    // Upsert episode details
    if (episodeId) {
      await supabase
        .from('episode_details')
        .update({ ...scrapedData })
        .match({ id: episodeId })
        .single();
    } else {
      const { data } = await supabase
        .from('episode_details')
        .insert({ ...scrapedData, slug })
        .select('id')
        .single();

      const newId = data?.id;
      if (!newId) throw new Error('Failed to insert new episode details');
      episodeId = newId;
    }

    // Upsert the URL
    await supabase
      .from('episode_urls')
      .upsert({ url: cleanedUrl, episode_id: episodeId, type: type }, { onConflict: 'url' });

    // Fetch updated episode details
    const { data, error } = await supabase
      .from('episode_details')
      .select(
        `
        *,
        episode_urls (url, type)
      `
      )
      .eq('id', episodeId)
      .single();

    if (error) throw new Error('Fetching updated episode details failed');

    return { ...data, urls: formatUrls(data.episode_urls) };
  } catch (error) {
    console.error('Error updating episode details:', error);
    return null;
  }
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
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }

  if (parsedUrl.hostname.includes('podcasts.apple.com')) {
    const i = parsedUrl.searchParams.get('i');
    return i
      ? { cleanedUrl: `https://podcasts.apple.com${parsedUrl.pathname}?i=${i}`, type: 'apple' }
      : null;
  } else if (parsedUrl.hostname.includes('open.spotify.com')) {
    return parsedUrl.pathname.includes('/episode/')
      ? { cleanedUrl: `https://open.spotify.com${parsedUrl.pathname}`, type: 'spotify' }
      : null;
  } else if (parsedUrl.hostname.includes('castro.fm')) {
    return parsedUrl.pathname.includes('/episode/')
      ? { cleanedUrl: `https://castro.fm${parsedUrl.pathname}`, type: 'castro' }
      : null;
  }

  return null;
}

export function slugifyDetails(episode_name: string, podcast_name: string): string {
  return slugify(`${podcast_name} ${episode_name}`, {
    lower: true, // Convert to lower case
    strict: true, // Strip special characters except replacement
  });
}
