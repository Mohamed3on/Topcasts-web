import { load } from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type EpisodeDetails = {
  episodeName: string;
  description: string;
  podcastName: string;
  imageUrl?: string;
  duration?: string;
  formattedDuration?: string;
  artistName?: string;
  guid?: string;
  audioURL?: string;
  podcastID?: string;
  episodeItunesID?: string;
  spotifyURL?: string;
  datePublished?: string;
  applePodcastsURL?: string;
};
const getCheerio = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();
  return load(html);
};

async function scrapeSpotifyEpisodeDetails(url: string) {
  const $ = await getCheerio(url);

  // parse out application/ld+json

  const jsonScript = $('script[type="application/ld+json"]').html();

  if (!jsonScript) {
    throw new Error('No JSON data found');
  }
  const parsedJson = JSON.parse(jsonScript);

  const episodeName = parsedJson.name;
  const podcastName = $('[data-testid=entity-header-entity-subtitle]').text();
  const description = parsedJson.description;
  const datePublished = parsedJson.datePublished;
  const duration = $('[data-testid=episode-progress-not-played]').text();

  const episodeImage = $('[data-testid=entity-header-entity-image]').attr('src');

  const returnObject: EpisodeDetails = {
    episodeName,
    description,
    podcastName,
    formattedDuration: duration,
    datePublished,
    spotifyURL: parsedJson.url,
    imageUrl: episodeImage,
  };

  return returnObject;
}
async function scrapeApplePodcastsEpisodeDetails(url: string) {
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

  const episodeName = episodeInfo.attributes.name;
  const podcastName = episodeInfo.relationships.podcast.data[0].attributes.name;
  const description = episodeInfo.attributes.description.standard;
  const imageUrl = episodeInfo.attributes.artwork.url
    .replace('{w}', '400')
    .replace('{h}', '400')
    .replace('{f}', 'png');

  const podcastiTunesID = episodeInfo.relationships.podcast.data[0].id;

  const episodeItunesID = episodeInfo.id;

  const duration = episodeInfo.attributes.durationInMilliseconds;

  const artistName = episodeInfo.attributes.artistName;

  const guid = episodeInfo.attributes.guid;

  const audioURL = episodeInfo.attributes.assetUrl;

  const returnObject: EpisodeDetails = {
    episodeName,
    description,
    duration,
    podcastName,
    imageUrl,
    artistName,
    guid,
    audioURL,
    podcastID: podcastiTunesID,
    episodeItunesID,
    applePodcastsURL: url,
  };

  return returnObject;
}

const getURLType = (url: string): 'apple' | 'spotify' | 'castro' | null => {
  const urlObject = new URL(url);

  if (urlObject.hostname.includes('apple.com')) {
    return 'apple';
  }

  if (urlObject.hostname.includes('spotify.com')) {
    return 'spotify';
  }

  if (urlObject.hostname.includes('castro.fm')) {
    return 'castro';
  }

  return null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const urlToScrape = searchParams.get('url');

  if (urlToScrape) {
    const urlType = getURLType(urlToScrape);
    try {
      if (urlType === 'apple') {
        const response = await scrapeApplePodcastsEpisodeDetails(urlToScrape);
        return NextResponse.json(response);
      } else if (urlType === 'spotify') {
        const response = await scrapeSpotifyEpisodeDetails(urlToScrape);
        return NextResponse.json(response);
      }

      return NextResponse.json({ error: 'Invalid URL type', status: 400 });
    } catch (error) {
      return NextResponse.json({ error: 'Error scraping episode details', status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'No URL provided', status: 400 });
  }
}
