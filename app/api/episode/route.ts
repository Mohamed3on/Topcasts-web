import { NextRequest, NextResponse } from 'next/server';

import {
  determineType,
  formatUrls,
  getHtml,
  scrapeDataByType,
  updateEpisodeDetails,
} from './utils';

import { SupabaseClient } from '@/app/api/types/SupabaseClient';
import { Database } from '@/app/api/types/supabase';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const getSupabaseServerClient = () => {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore as CookieOptions,
    }
  );

  return supabase;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();

  const { searchParams } = request.nextUrl;
  const episode_id = searchParams.get('episode_id') || '';

  if (!episode_id) {
    return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('episode_details')
    .select(
      `
      *,
      episode_urls (url, type)
    `
    )
    .eq('id', episode_id)
    .single();

  if (error || !data) {
    console.error('Error fetching episode details:', error);
    return NextResponse.json(
      { error: `Failed to fetch episode details: ${error?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...data, urls: formatUrls(data.episode_urls) });
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
}): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();
  const urlInput = url.trim();
  const cleanedUrl = cleanUrl(urlInput); // Assume this function exists to standardize URLs.
  const type = determineType(cleanedUrl);

  if (!type) {
    // Handle non-podcast URLs by following redirects to check if it becomes a podcast URL.
    return handleNonPodcastURL(cleanedUrl);
  }

  // find url in supabase
  const { data } = await supabase
    .from('episode_urls')
    .select('episode_id')
    .eq('url', cleanedUrl)
    .single();

  if (data?.episode_id) {
    const episodeDetails = await getEpisodeDetailsFromDb(data.episode_id);

    return NextResponse.json(episodeDetails);
  }

  if (!html) {
    html = await getHtml(cleanedUrl.toString());
  }
  return handleNewEpisodeData({
    type,
    html,
    cleanedUrl,
    supabase,
  });
}

const getEpisodeDetailsFromDb = async (episodeId: number) => {
  const supabase = getSupabaseServerClient();
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

  if (error || !data) {
    console.error('Episode ID not in DB:', error);
    return null;
  }

  return { ...data, urls: formatUrls(data.episode_urls) };
};

async function handleNonPodcastURL(cleanedUrl: string) {
  const response = await fetch(cleanedUrl, { redirect: 'follow', method: 'GET' });
  const finalUrl = response.url;

  const type = determineType(finalUrl);
  if (!type) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const html = await response.text();
  return handlePodcastURL({
    url: finalUrl,
    html,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  if (!body || !body?.url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  return handlePodcastURL({
    url: body.url,
  });
}

async function handleNewEpisodeData({
  type,
  html,
  cleanedUrl,
  supabase,
}: {
  type: 'apple' | 'spotify' | 'castro';
  html: string;
  cleanedUrl: string;
  supabase: SupabaseClient;
}) {
  try {
    const scrapedData = await scrapeDataByType(type, html);

    const response = await updateEpisodeDetails({
      type,
      cleanedUrl,
      scrapedData,
      supabase,
    });

    return NextResponse.json(response || { error: 'Failed to update episode details' }, {
      status: response ? 200 : 500,
    });
  } catch (error) {
    console.error('Error scraping data:', error);
    return NextResponse.json({ error: 'Error scraping episode details', status: 500 });
  }
}
