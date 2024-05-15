import { NextRequest, NextResponse } from 'next/server';

import { determineType, formatUrls, getHtml, scrapeDataByType } from './utils';

import { ScrapedEpisodeDetails } from '@/app/api/types';
import { createClient } from '@/utils/supabase/server';
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

async function handlePodcastURL({
  url,
  html,
}: {
  url: string;
  html?: string;
}): Promise<
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
    // Handle non-podcast URLs by following redirects to check if it becomes a podcast URL.
    return handleNonPodcastURL(cleanedUrl);
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

  if (!html) {
    html = await getHtml(cleanedUrl.toString());
  }
  return handleNewEpisodeData({
    type,
    html,
    cleanedUrl,
  });
}

const getEpisodeDetailsFromDb = async (episodeId: number) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('podcast_episode')
    .select(
      `
      *,
      podcast_episode_url (url, type)
    `,
    )
    .eq('id', episodeId)
    .single();

  if (error || !data) {
    console.error('Episode ID not in DB:', error);
    return null;
  }

  return { ...data, urls: formatUrls(data.podcast_episode_url) };
};

async function handleNonPodcastURL(cleanedUrl: string) {
  const response = await fetch(cleanedUrl, {
    redirect: 'follow',
    method: 'GET',
  });
  const finalUrl = response.url;

  const type = determineType(finalUrl);
  if (!type) {
    return { error: 'Invalid URL', status: 400 };
  }

  const html = await response.text();
  return handlePodcastURL({
    url: finalUrl,
    html,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!body || !body?.url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const rating = body.rating;

  const reviewText = body.review_text;

  const response = await handlePodcastURL({
    url: body.url,
  });

  if (!response) {
    return NextResponse.json(
      { error: 'Failed to fetch episode details' },
      { status: 500 },
    );
  }
  if ('error' in response) {
    return NextResponse.json(
      {
        error: response.error,
      },
      { status: response.status },
    );
  }

  if (rating && user) {
    await supabase.from('podcast_episode_review').upsert(
      {
        episode_id: response.id,
        user_id: user.id,
        review_type: rating,
        text: reviewText,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id, episode_id',
      },
    );
  }

  return NextResponse.json(response);
}

async function handleNewEpisodeData({
  type,
  html,
  cleanedUrl,
}: {
  type: 'apple' | 'spotify' | 'castro';
  html: string;
  cleanedUrl: string;
}) {
  try {
    const scrapedData = await scrapeDataByType(type, html);

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
}): Promise<
  | { id: number; slug: string }
  | {
      error: string;
      status: number;
    }
> {
  const supabase = createClient();
  try {
    const slug = slugifyDetails(
      scrapedData.episode_name,
      scrapedData.podcast_name,
    );

    const { data, error } = await supabase
      .from('podcast_episode')
      .upsert({ ...scrapedData, slug }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert episode details');
    const episodeId = data.id;

    // save the url to the podcast_episode_url table
    const urlUpsert = await supabase
      .from('podcast_episode_url')
      .insert({ url: cleanedUrl, episode_id: episodeId, type })
      .select('episode_id')
      .single();

    if (urlUpsert.error) throw urlUpsert.error;
    if (!urlUpsert.data) throw new Error('Failed to upsert episode URL');

    return { id: episodeId, slug };
  } catch (error) {
    console.error('Error updating episode details:', error);
    return {
      error: 'Failed to update episode details',
      status: 500,
    };
  }
}
