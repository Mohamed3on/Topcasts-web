import { NextRequest, NextResponse } from 'next/server';

import { determineType, formatUrls, scrapeDataByType } from './utils';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '@/app/api/types';
import { createClient } from '@/utils/supabase/server';
import { upsertEpisode, upsertEpisodeUrl, upsertPodcastDetails } from './db';
import { slugifyDetails } from './utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();

  const { searchParams } = request.nextUrl;
  const episode_id = searchParams.get('episode_id') || '';

  if (!episode_id) {
    return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('episode_with_rating_data')
    .select(
      `
      *,
      podcast_episode_url (url, type)
    `,
    )
    .eq('id', episode_id)
    .single();

  if (error || !data) {
    console.error('Error fetching episode details:', error);
    return NextResponse.json(
      { error: `Failed to fetch episode details: ${error?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...data,
    urls: formatUrls(data.podcast_episode_url),
  });
}

const cleanUrl = (urlString: string) => {
  const url = new URL(urlString);
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '');

  const params = new URLSearchParams();
  if (url.searchParams.has('i')) {
    params.set('i', url.searchParams.get('i')!);
  }
  url.search = params.toString();

  return `${url.origin}${url.pathname}${url.search ? `${url.search}` : ''}`;
};

async function handlePodcastURL({ url }: { url: string }): Promise<
  | {
      id: number;
      slug: string | null;
    }
  | {
      error: string;
      status: number;
    }
> {
  const supabase = createClient();

  const urlInput = url.trim();
  const cleanedUrl = cleanUrl(urlInput);
  const type = determineType(cleanedUrl);

  if (!type) {
    return {
      error: 'Unsupported URL, must be Apple, Spotify, or castro',
      status: 400,
    };
  }

  // find url in supabase
  const { data } = await supabase
    .from('podcast_episode_url')
    .select('episode_id')
    .eq('url', cleanedUrl)
    .single();

  if (data?.episode_id) {
    const episodeDetails = await getEpisodeDetailsFromDb(data.episode_id);

    if (episodeDetails) return episodeDetails;
  }

  return handleNewEpisodeData({
    type,
    cleanedUrl,
  });
}

const getEpisodeDetailsFromDb = async (episodeId: number) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('podcast_episode')
    .select(
      `id, slug
    `,
    )
    .eq('id', episodeId)
    .single();

  if (error || !data.id) {
    console.error('Episode ID not in DB:', error);
    return null;
  }

  return data;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const body = await request.json();
  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace('Bearer ', '');
  const secret = process.env.SUPABASE_JWT_SECRET;

  let user;
  if (token && secret) {
    try {
      user = jwt.verify(token, secret) as JwtPayload;
      user.id = user.sub;
    } catch (error) {
      console.error('JWT is not valid:', error);
      return NextResponse.json(
        { error: 'Invalid Authorization' },
        { status: 401 },
      );
    }
  } else {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  }

  if (!user)
    return NextResponse.json(
      { error: 'Invalid Authorization' },
      { status: 401 },
    );
  if (!body?.url)
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });

  const response = await handlePodcastURL({ url: body.url });
  if (!response)
    return NextResponse.json(
      { error: 'Failed to fetch episode details' },
      { status: 500 },
    );
  if ('error' in response)
    return NextResponse.json(
      { error: response.error },
      { status: response.status },
    );

  if (body.rating) {
    await supabase.from('podcast_episode_review').upsert(
      {
        episode_id: response.id,
        user_id: user.id,
        review_type: body.rating,
        text: body.review_text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, episode_id' },
    );
  }

  return NextResponse.json(response);
}

async function handleNewEpisodeData({
  type,
  cleanedUrl,
}: {
  type: 'apple' | 'spotify' | 'castro';
  cleanedUrl: string;
}) {
  try {
    const scrapedData = await scrapeDataByType(type, cleanedUrl);

    if (!scrapedData.episode_name) {
      return {
        error: 'Episode does not exist or could not be scraped',
        status: 400,
      };
    }

    const episodeDetails = await updateEpisodeDetails({
      type,
      cleanedUrl,
      scrapedData,
    });

    return (
      episodeDetails || {
        error: 'Failed to update episode details',
        status: 500,
      }
    );
  } catch (error) {
    console.error('Error scraping data:', error);
    return {
      error: 'Error scraping episode details',
      status: 500,
    };
  }
}
async function updateEpisodeDetails({
  type,
  cleanedUrl,
  scrapedData,
}: {
  type: 'apple' | 'spotify' | 'castro';
  cleanedUrl: string;
  scrapedData: ScrapedEpisodeDetails;
}): Promise<{ id: number; slug: string } | { error: string; status: number }> {
  const supabase = createClient();
  try {
    const slug = slugifyDetails(
      scrapedData.episode_name,
      scrapedData.podcast_name,
    );

    const podcastData = {
      name: scrapedData.podcast_name,
      itunes_id: scrapedData.podcast_itunes_id,
      spotify_id: scrapedData.spotify_show_id,
      genres: scrapedData.podcast_genres,
      rss_feed: scrapedData.rss_feed,
      artist_name: scrapedData.artist_name,
    };

    const episodeData: ScrapedEpisodeData = {
      audio_url: scrapedData.audio_url,
      date_published: scrapedData.date_published,
      description: scrapedData.description,
      duration: scrapedData.duration,
      episode_itunes_id: scrapedData.episode_itunes_id,
      episode_name: scrapedData.episode_name,
      formatted_duration: scrapedData.formatted_duration,
      guid: scrapedData.guid,
      image_url: scrapedData.image_url,
      slug: slug,
    };

    const podcastId = await upsertPodcastDetails(supabase, podcastData);

    const { data: episode, error: episodeError } = await upsertEpisode(
      supabase,
      episodeData,
      podcastId,
    );
    if (episodeError || !episode)
      throw new Error(
        `Failed to upsert episode: ${JSON.stringify(episodeError)}`,
      );

    const { error: urlError } = await upsertEpisodeUrl(
      supabase,
      cleanedUrl,
      episode.id,
      type,
    );
    if (urlError)
      throw new Error(
        `Failed to upsert episode URL: ${JSON.stringify(urlError)}`,
      );

    return { id: episode.id, slug };
  } catch (error) {
    console.error('Error updating episode details:', error);
    return { error: 'Failed to update episode details', status: 500 };
  }
}
