import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dupqaaqpafucdxrmrmkv.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

import {
  determineType,
  scrapeDataByType,
  slugifyDetails,
} from '@/app/api/episode/utils';
import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '@/app/api/types';
// import { Database } from 'bun:sqlite';
import {
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from '@/app/api/episode/db';
import tweetData from '../../scrape-tweets/url_to_tweets.json';

async function updateEpisodeDetails({
  type,
  cleanedUrl,
  scrapedData,
}: {
  type: 'apple' | 'spotify' | 'castro';
  cleanedUrl: string;
  scrapedData: ScrapedEpisodeDetails;
}): Promise<{ id: number; slug: string } | { error: string; status: number }> {
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

async function processTweets() {
  for (const [url, urlShares] of Object.entries(tweetData)) {
    console.log('🚀 ~ processTweets ~ url:', url);

    const type = determineType(url);
    if (!type) throw new Error('Failed to determine type');
    const scrapedData = await scrapeDataByType(type, url);

    const { data } = await supabase
      .from('podcast_episode_url')
      .select('episode_id')
      .eq('url', url)
      .single();

    let id = data?.episode_id;
    if (!data) {
      const response = await updateEpisodeDetails({
        type,
        cleanedUrl: url,
        scrapedData: scrapedData,
      });
      if ('id' in response) id = response.id;
    }

    console.log('mentioned by', urlShares.mentioned_by);
    console.log('scraped episode', scrapedData.episode_name);
    // url
    console.log('url and ID', url, id);

    const { data: share_data, error } = await supabase
      .from('social_share')
      .upsert([
        ...urlShares.tweets.map((tweet) => ({
          episode_id: id,
          twitter_screen_name: tweet.screen_name,
          shared_at: new Date(tweet.created_at).toISOString(),
        })),
      ]);
    if (error) console.log('error inserting social shares', error);
  }
}

// @ts-ignore
// await processTweets();

// const processCastroData = async () => {
//   console.log('🚀 ~ processCastroData ~ db:', db);

//   const query = db.query(
//     `SELECT SUPEpisode.*, SUPPodcast.iTunesCategory, SUPPodcast.iTunesSubCategory, SupPodcast.author
//   FROM SUPEpisode
//   JOIN SUPPodcast ON SUPEpisode.podcastId = SUPPodcast.id
//   WHERE SUPEpisode.starred = 1;`,
//   );

//   for (const row of query.all()) {
//     const url = `https://castro.fm/episode/${row?.shortId}`;

//     const genres = [row?.iTunesCategory, row?.iTunesSubcategory].filter(
//       Boolean,
//     );

//     const html = await getHtml(url);

//     const scrapedData = await scrapeDataByType('castro', html);

//     const fullData = {
//       ...scrapedData,
//       podcast_genres: genres,
//       artist_name: row?.author,
//     };

//     const episodeDetails = await updateEpisodeDetails({
//       type: 'castro',
//       cleanedUrl: url,
//       scrapedData: fullData,
//     });

//     console.log('scraped episode', scrapedData.episode_name);

//     if (!('error' in episodeDetails))
//       await supabase.from('podcast_episode_review').upsert(
//         {
//           episode_id: episodeDetails.id,
//           user_id: 'e2173275-b181-4035-89f8-a87e768047b4',
//           review_type: 'like',
//           updated_at: new Date().toISOString(),
//         },
//         {
//           onConflict: 'user_id, episode_id',
//         },
//       );
//   }
// };

// await processCastroData();
