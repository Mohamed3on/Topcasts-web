import { NextRequest, NextResponse } from 'next/server';

import {
  scrapeDataByType,
  updateEpisodeDetails,
  parseAndCleanUrl,
  createIdentifierFromDetails,
} from './utils';

// export const dynamic = 'force-dynamic';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/app/api/types/supabase';
import { EpisodeDetails } from '@/app/api/types';

export type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;
const getSupabaseServerClient = () => {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  return supabase;
};

export async function GET(request: NextRequest) {
  const supabaseServerClient = getSupabaseServerClient();
  const { searchParams } = request.nextUrl;
  const originalUrl = searchParams.get('url') || '';

  const parsedUrl = parseAndCleanUrl(originalUrl);
  if (!parsedUrl) {
    return NextResponse.json({ error: 'No valid URL provided', status: 400 });
  }

  const { cleanedUrl, type } = parsedUrl;
  if (!type) {
    return NextResponse.json({ error: 'Invalid URL', status: 400 });
  }

  const existingEpisode = await fetchEpisodeDetails(cleanedUrl, supabaseServerClient);
  if (existingEpisode) {
    return NextResponse.json(existingEpisode);
  }

  // Scrape new data and update the database if not found or forced update
  return await handleNewEpisodeData(type, cleanedUrl, supabaseServerClient);
}

async function fetchEpisodeDetails(cleanedUrl: string, supabase: SupabaseClient) {
  // Retrieve episode details and URLs together
  const { data, error } = await supabase
    .from('episode_urls')
    .select(
      `
        episode_id,
        episode_details (
          *,
          episode_urls (url, type)
        )
      `
    )
    .eq('url', cleanedUrl)
    .single();

  if (error) {
    return null;
  }

  if (data.episode_details) {
    const episodeDetails: EpisodeDetails = {
      ...data.episode_details,
      urls: formatUrls(data.episode_details.episode_urls),
    };
    return episodeDetails;
  }
}

async function handleNewEpisodeData(
  type: 'apple' | 'spotify' | 'castro',
  cleanedUrl: string,
  supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    const scrapedData: EpisodeDetails = await scrapeDataByType(type, cleanedUrl); // Assume scrapeDataByType is properly typed
    const identifier = createIdentifierFromDetails(
      scrapedData.episode_name,
      scrapedData.podcast_name
    );

    const updatedEpisode = await updateEpisodeDetails({
      identifier,
      type,
      cleanedUrl,
      scrapedData,
      supabase,
    });

    return NextResponse.json(
      updatedEpisode ? updatedEpisode : { error: 'Failed to update episode details' },
      {
        status: updatedEpisode ? 200 : 500,
      }
    );
  } catch (error) {
    console.error('Error scraping data:', error);
    return NextResponse.json({ error: 'Error scraping episode details', status: 500 });
  }
}

export function formatUrls(urlsArray: { url: string; type: string }[]): Record<string, string> {
  const urls: Record<string, string> = {};
  urlsArray.forEach((urlEntry) => {
    urls[urlEntry.type] = urlEntry.url;
  });
  return urls;
}
