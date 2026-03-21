import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { jwtVerify } from 'jose';
import { cleanUrl, determineType, formatUrls, scrapeDataByType, toPodcastData } from './utils';
import { supabaseAdmin as supabase } from '@/utils/supabase/server';
import { sendTelegramAlert } from '@/utils/telegram';
import { updatePodcast } from './db';
import {
  lookupEpisodeByUrl,
  processNewEpisode,
  saveReview,
  tryRevalidate,
} from './process';
import { ScrapedEpisodeDetails } from '@/app/api/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const episode_id = searchParams.get('episode_id');

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
    .eq('id', parseInt(episode_id))
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

async function handlePodcastURL({
  url,
}: {
  url: string;
}): Promise<
  { id: number; slug: string | null } | { error: string; status: number }
> {
  const cleanedUrl = cleanUrl(url.trim());
  const type = determineType(cleanedUrl);

  if (!type) {
    return {
      error: 'Unsupported URL, must be Apple, Spotify, or castro',
      status: 400,
    };
  }

  const existing = await lookupEpisodeByUrl(url);

  if (existing) {
    // Check if podcast metadata needs refreshing (missing artist_name or image_url)
    if (
      (!existing.podcast?.artist_name || !existing.podcast?.image_url) &&
      existing.podcast_id
    ) {
      const { ctx } = getCloudflareContext();
      ctx.waitUntil(
        refreshPodcastMetadata(type, cleanedUrl, existing.podcast_id),
      );
    }
    return { id: existing.id, slug: existing.slug };
  }

  try {
    return await processNewEpisode(type, cleanedUrl);
  } catch (error) {
    console.error('Error processing episode:', error);
    sendTelegramAlert(
      `⚠️ Processing failed for ${type} URL:\n${cleanedUrl}\n\n${error instanceof Error ? error.message : String(error)}`,
    );
    return { error: 'Failed to process episode', status: 500 };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace('Bearer ', '');
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { error: 'Invalid Authorization' },
      { status: 401 },
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );

    if (!payload.sub) {
      return NextResponse.json(
        { error: 'Invalid token: missing subject' },
        { status: 401 },
      );
    }

    const user = { id: payload.sub, ...payload };

    if (!body?.url || !body?.rating)
      return NextResponse.json(
        { error: 'Invalid URL or rating' },
        { status: 400 },
      );

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

    // Defer the review upsert to background — don't block the response
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(saveReview(response.id, user.id, body.rating, body.review_text));

    return NextResponse.json(response);
  } catch (error) {
    console.error('JWT is not valid:', error);
    return NextResponse.json(
      { error: 'Invalid Authorization' },
      { status: 401 },
    );
  }
}

async function refreshPodcastMetadata(
  type: 'apple' | 'spotify' | 'castro',
  cleanedUrl: string,
  podcastId: number,
): Promise<void> {
  // Use scrapeDataByType directly — unstable_cache doesn't work inside waitUntil
  const scrapedData = (await scrapeDataByType(
    type,
    cleanedUrl,
  )) as ScrapedEpisodeDetails;

  if (!scrapedData.artist_name && !scrapedData.image_url) {
    return;
  }

  await updatePodcast(supabase, podcastId, toPodcastData(scrapedData));
  tryRevalidate(`podcast-details:${podcastId}`);
  tryRevalidate(`podcast-metadata:${podcastId}`);
}
