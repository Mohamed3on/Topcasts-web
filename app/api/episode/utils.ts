import { load } from 'cheerio';
import { EpisodeDetails } from '../types';
import slugify from 'slugify';
import { SupabaseClient } from '@/app/api/types/supabase';

export function formatUrls(urlsArray: { url: string; type: string }[]): Record<string, string> {
  return urlsArray.reduce((acc, { type, url }) => ({ ...acc, [type]: url }), {});
}

const getCheerio = async (html: string) => {
  try {
    return load(html);
  } catch (error) {
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
}): Promise<{ id: number; slug: string } | null> {
  try {
    const slug = slugifyDetails(scrapedData.episode_name, scrapedData.podcast_name);

    // Perform a conditional upsert based on the slug
    const { data, error } = await supabase
      .from('episode_details')
      .upsert({ ...scrapedData, slug }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert episode details');

    const episodeId = data.id;

    // Upsert the URL with episode_id
    const urlUpsert = await supabase
      .from('episode_urls')
      .upsert({ url: cleanedUrl, episode_id: episodeId, type }, { onConflict: 'url' })
      .select('episode_id')
      .single();

    if (urlUpsert.error) throw urlUpsert.error;
    if (!urlUpsert.data) throw new Error('Failed to upsert episode URL');

    return { id: episodeId, slug };
  } catch (error) {
    console.error('Error updating episode details:', error);
    return null;
  }
}

export async function scrapeDataByType(type: 'apple' | 'spotify' | 'castro', html: string) {
  switch (type) {
    case 'apple':
      return await scrapeApplePodcastsEpisodeDetails(html);
    case 'spotify':
      return await scrapeSpotifyEpisodeDetails(html);
    case 'castro':
      return await scrapeCastroEpisodeDetails(html);
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
export async function scrapeApplePodcastsEpisodeDetails(html: string) {
  const $ = await getCheerio(html);

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

export async function scrapeCastroEpisodeDetails(html: string) {
  const $ = await getCheerio(html);

  const episode_name = $('h1').text();
  const podcast_name = $('h2').eq(0).text();
  const description = $('.co-supertop-castro-show-notes').html();

  const pocketCastsLink = $('a[href*="pca.st"]').attr('href');
  const itunesId = pocketCastsLink?.split('/').pop();

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
    podcast_itunes_id: itunesId,
  };

  return returnObject;
}

interface ParsedUrlResult {
  cleanedUrl: string;
  type: 'apple' | 'spotify' | 'castro';
  html: string;
}

interface ParsedUrlResult {
  cleanedUrl: string;
  type: 'apple' | 'spotify' | 'castro';
  html: string;
}

// Utility function to determine URL type
export function determineType(urlString: string): 'apple' | 'spotify' | 'castro' | null {
  const url = new URL(urlString);

  console.log(url.searchParams.get('i')); // Debugging output

  if (url.hostname.includes('podcasts.apple.com') && url.searchParams.get('i')) {
    return 'apple';
  } else if (url.hostname.includes('open.spotify.com') && url.pathname.includes('/episode/')) {
    return 'spotify';
  } else if (url.hostname.includes('castro.fm') && url.pathname.includes('/episode/')) {
    return 'castro';
  }
  return null;
}

// Main parsing function
export async function getHtml(url: string): Promise<string> {
  const response = await fetch(url, { method: 'GET' });
  const html = await response.text();

  return html;
  // const parsedUrl = new URL(url);

  // const cleanedUrl =
  //   type === 'apple'
  //     ? `https://podcasts.apple.com${parsedUrl.pathname}?i=${parsedUrl.searchParams.get('i')}`
  //     : type === 'spotify'
  //     ? `https://open.spotify.com${parsedUrl.pathname}`
  //     : type === 'castro'
  //     ? `https://castro.fm/episode/${parsedUrl.pathname.split('/').pop()}`
  //     : '';

  // return {
  //   cleanedUrl,
  //   type,
  //   html,
  // };
}

export function slugifyDetails(episode_name: string, podcast_name: string): string {
  return slugify(`${podcast_name} ${episode_name}`, {
    lower: true, // Convert to lower case
    strict: true, // Strip special characters except replacement
  });
}
