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
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from '@/app/api/episode/db';
import {
  determineType,
  scrapeDataByType,
  slugifyDetails,
} from '@/app/api/episode/utils';
import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '@/app/api/types';
import tweetData from './scrape-tweets/url_to_tweets.json';

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

    const { data } = await supabase
      .from('podcast_episode_url')
      .select('episode_id')
      .eq('url', url)
      .single();
    let id = data?.episode_id;

    if (!data) {
      const scrapedData = await scrapeDataByType(type, url);
      const response = await updateEpisodeDetails({
        type,
        cleanedUrl: url,
        scrapedData: scrapedData,
      });
      if ('id' in response) id = response.id;
      console.log('scraped episode', scrapedData.episode_name);
    }
    console.log('mentioned by', urlShares.mentioned_by);

    // url
    console.log('url and ID', url, id);

    await supabase.from('social_share').upsert([
      ...urlShares.tweets.map((tweet) => ({
        episode_id: id,
        twitter_screen_name: tweet.screen_name,
        shared_at: new Date(tweet.created_at).toISOString(),
        tweet_id: tweet.tweet_id,
        tweet_text: tweet.tweet_text,
      })),
    ]);
  }
}

// @ts-ignore
await processTweets();
