import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dupqaaqpafucdxrmrmkv.supabase.co',
  // API KEY '',
  '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

import {
  getHtml,
  scrapeDataByType,
  slugifyDetails,
} from '@/app/api/episode/utils';
import { ScrapedEpisodeDetails } from '@/app/api/types';
import { Database } from 'bun:sqlite';

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
  try {
    const slug = slugifyDetails(
      scrapedData.episode_name,
      scrapedData.podcast_name,
    );

    const { data, error } = await supabase
      .from('episode_details')
      .upsert({ ...scrapedData, slug }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert episode details');
    const episodeId = data.id;

    // save the url to the episode_urls table
    const urlUpsert = await supabase
      .from('episode_urls')
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

// load db from file

let db = new Database('./Castro.sqlite');

// add where starred = 1 and limit to 20
const query = db.query(
  `SELECT SUPEpisode.*, SUPPodcast.iTunesCategory, SUPPodcast.iTunesSubCategory, SupPodcast.author
  FROM SUPEpisode
  JOIN SUPPodcast ON SUPEpisode.podcastId = SUPPodcast.id
  WHERE SUPEpisode.starred = 1;`,
);

const process = async () => {
  for (const row of query.all()) {
    const url = `https://castro.fm/episode/${row?.shortId}`;

    const genres = [row?.iTunesCategory, row?.iTunesSubcategory].filter(
      Boolean,
    );
    console.log('🚀 ~ process ~ genres:', genres);

    const html = await getHtml(url);

    const scrapedData = await scrapeDataByType('castro', html);

    const fullData = {
      ...scrapedData,
      audio_url: `https://castro.fm${row?.mediaUrl}`,
      podcast_genres: genres,
    };

    const episodeDetails = await updateEpisodeDetails({
      type: 'castro',
      cleanedUrl: url,
      scrapedData: fullData,
    });

    console.log('scraped episode', scrapedData.episode_name);

    if (!('error' in episodeDetails))
      await supabase.from('episode_reviews').upsert(
        {
          episode_id: episodeDetails.id,
          user_id: 'e2173275-b181-4035-89f8-a87e768047b4',
          review_type: 'like',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id, episode_id',
        },
      );
  }
};

await process();

// // Access auth admin api
