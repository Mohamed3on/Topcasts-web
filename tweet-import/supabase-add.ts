import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

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
    if (episodeError || !episode) {
      console.error('Failed to upsert episode:', episodeError);
      return { error: 'Failed to upsert episode', status: 500 };
    }

    const { error: urlError } = await upsertEpisodeUrl(
      supabase,
      cleanedUrl,
      episode.id,
      type,
    );
    if (urlError) {
      console.error('Failed to upsert episode URL:', urlError);
      return { error: 'Failed to upsert episode URL', status: 500 };
    }

    return { id: episode.id, slug };
  } catch (error) {
    console.error('Error updating episode details:', error);
    return { error: 'Failed to update episode details', status: 500 };
  }
}

async function processTweets() {
  for (const [url, urlShares] of Object.entries(tweetData)) {
    let shouldProcess = false;

    for (const tweet of urlShares.tweets) {
      const { error } = await supabase
        .from('social_share')
        .select('episode_id')
        .eq('tweet_id', tweet.tweet_id)
        .single();

      if (error) {
        // tweet id not found, process this URL
        console.log(chalk.red('Tweet not found in database'), tweet.tweet_id);
        shouldProcess = true;
        break;
      }
    }

    if (!shouldProcess) {
      continue;
    }

    console.log(chalk.yellow('🚀 Processing URL:'), chalk.blue(url));

    const type = determineType(url);
    if (!type) {
      console.error('❌ Failed to determine type for URL:', url);
      continue;
    }

    const { data, error } = await supabase
      .from('podcast_episode_url')
      .select('episode_id')
      .eq('url', url)
      .single();

    if (error) {
      console.error('Error querying podcast_episode_url:', error);
      continue;
    }

    let id = data?.episode_id;

    if (!data) {
      let scrapedData: ScrapedEpisodeDetails;
      try {
        scrapedData = await scrapeDataByType(type, url);
      } catch (error) {
        console.error(chalk.red('❌ Error scraping data:'), error);
        continue;
      }

      const response = await updateEpisodeDetails({
        type,
        cleanedUrl: url,
        scrapedData: scrapedData,
      });

      if ('error' in response) {
        console.error('❌ Error updating episode details:', response.error);
        continue;
      }

      id = response.id;
      console.log(
        chalk.green('🆕 Scraped episode:'),
        chalk.magenta(scrapedData.episode_name),
        url,
      );
    } else {
      console.log(chalk.green('🔍 Found episode ID:'), chalk.magenta(id));
    }

    console.log(
      chalk.cyan('📢 Mentioned by:'),
      chalk.blue(urlShares.mentioned_by.join(', ')),
    );

    console.log(chalk.cyan('🔗 ID:'), chalk.magenta(id));

    const dataToUpsert = urlShares.tweets.map((tweet) => ({
      episode_id: id,
      twitter_screen_name: tweet.screen_name,
      shared_at: new Date(tweet.created_at).toISOString(),
      tweet_id: tweet.tweet_id,
      tweet_text: tweet.tweet_text,
    }));
    console.log('🚀 ~ dataToUpsert ~ dataToUpsert:', dataToUpsert);

    const { data: social_add_data, error: socialAddError } = await supabase
      .from('social_share')
      .upsert(dataToUpsert);

    if (socialAddError) {
      console.error(
        chalk.red('❌ Error inserting social data:'),
        socialAddError,
      );
    } else {
      console.log(chalk.green('✅ Inserted social data:'), social_add_data);
    }
  }
}

// @ts-ignore
await processTweets();
