import { load } from 'cheerio';
import { NextRequest, NextResponse } from 'next/server';

import * as admin from 'firebase-admin';

import { createHash } from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    }),
  });
}

const db = admin.firestore();

export const dynamic = 'force-dynamic';

function createIdentifierFromDetails(episodeName: string, podcastName: string): string {
  // Normalize the input
  const normalizedEpisodeName = normalizeString(episodeName);
  const normalizedPodcastName = normalizeString(podcastName);

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

function createDocumentId(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

const cleanUrl = (url: string) => {
  try {
    const isValidUrl = isCorrectEpisodeURL(url);
    if (!isValidUrl) {
      return null;
    }
    const urlObject = new URL(url);

    if (urlObject.hostname.includes('spotify.com')) {
      // For Spotify, use only the pathname without any parameters
      return `https://open.spotify.com${urlObject.pathname}`;
    } else if (urlObject.hostname.includes('apple.com')) {
      // For Apple Podcasts, keep only the 'i' parameter
      const i = urlObject.searchParams.get('i');
      return `https://podcasts.apple.com${urlObject.pathname}?i=${i}`;
    } else if (urlObject.hostname.includes('castro.fm')) {
      // For Castro, use only the pathname without any parameters
      return `https://castro.fm${urlObject.pathname}`;
    } else {
      // Return the original URL if it doesn't match known patterns
      return url;
    }
  } catch (error) {
    console.error('Error cleaning URL:', error);
    return null;
  }
};

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
  const description = parsedJson?.description;
  const datePublished = parsedJson?.datePublished;
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

const isCorrectEpisodeURL = (url: string): boolean => {
  const urlObject = new URL(url);

  if (urlObject.hostname.includes('podcasts.apple.com')) {
    return urlObject.searchParams.has('i');
  }
  if (urlObject.hostname.includes('open.spotify.com')) {
    return urlObject.pathname.includes('/episode/');
  }

  if (urlObject.hostname.includes('castro.fm')) {
    return urlObject.pathname.includes('/episode/');
  }

  return false;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const originalUrl = searchParams.get('url') || '';
  const urlToScrape = cleanUrl(originalUrl);

  if (!urlToScrape) {
    return NextResponse.json(
      { error: 'No valid URL provided' },
      {
        status: 400,
      }
    );
  }
  const documentId = createDocumentId(urlToScrape);

  const urlRef = db.collection('urlToEpisodeDetails').doc(documentId);
  const urlDoc = await urlRef.get();

  if (urlDoc.exists) {
    // Retrieve the episode details using the identifier from urlDoc
    const episodeId = urlDoc.data()?.episodeId;
    const episodeRef = db.collection('episodeDetails').doc(episodeId);
    const episodeDoc = await episodeRef.get();

    return NextResponse.json(episodeDoc.data());
  }

  const urlType = getURLType(urlToScrape);
  if (!urlType) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    let scrapedData;
    if (urlType === 'apple') {
      scrapedData = await scrapeApplePodcastsEpisodeDetails(urlToScrape);
    } else if (urlType === 'spotify') {
      scrapedData = await scrapeSpotifyEpisodeDetails(urlToScrape);
    } else {
      return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 });
    }

    // Prepare data for merging
    const identifier = createIdentifierFromDetails(
      scrapedData.episodeName,
      scrapedData.podcastName
    );

    // Store updated data in Firestore
    await db.collection('episodeDetails').doc(identifier).set(scrapedData, { merge: true });

    // get the updated data
    const updatedResponse = (await db.collection('episodeDetails').doc(identifier).get()).data();

    // storeURL to EpisodeDetails mapping
    await urlRef.set({ episodeId: identifier });

    return NextResponse.json(updatedResponse);
  } catch (error) {
    console.error('Error scraping data:', error);
    return NextResponse.json({ error: 'Error scraping episode details' }, { status: 500 });
  }
}
