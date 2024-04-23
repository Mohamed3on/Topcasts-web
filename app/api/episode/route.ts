import { NextRequest, NextResponse } from 'next/server';

import {
  scrapeDataByType,
  updateEpisodeDetails,
  parseAndCleanUrl,
  createIdentifierFromDetails,
  formatUrls,
} from './utils';

// export const dynamic = 'force-dynamic';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/app/api/types/supabase';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();
  const { searchParams } = request.nextUrl;
  const originalUrl = searchParams.get('url') || '';

  const parsedUrl = parseAndCleanUrl(originalUrl);
  if (!parsedUrl || !parsedUrl.type) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const { cleanedUrl, type } = parsedUrl;

  const episodeDetails = await fetchEpisodeDetails(cleanedUrl, supabase);
  if (episodeDetails) {
    return NextResponse.json(episodeDetails);
  }

  return await handleNewEpisodeData(type, cleanedUrl, supabase);
}

async function fetchEpisodeDetails(cleanedUrl: string, supabase: SupabaseClient) {
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

  if (error || !data?.episode_details) {
    console.error('Error fetching episode details:', error);
    return null;
  }

  return {
    ...data.episode_details,
    urls: formatUrls(data.episode_details.episode_urls),
  };
}
async function handleNewEpisodeData(
  type: 'apple' | 'spotify' | 'castro',
  cleanedUrl: string,
  supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    const scrapedData = await scrapeDataByType(type, cleanedUrl);
    const identifier = createIdentifierFromDetails(
      scrapedData.episode_name,
      scrapedData.podcast_name
    );
    const episode = await updateEpisodeDetails({
      identifier,
      type,
      cleanedUrl,
      scrapedData,
      supabase,
    });

    return NextResponse.json(episode || { error: 'Failed to update episode details' }, {
      status: episode ? 200 : 500,
    });
  } catch (error) {
    console.error('Error scraping data:', error);
    return NextResponse.json({ error: 'Error scraping episode details', status: 500 });
  }
}
