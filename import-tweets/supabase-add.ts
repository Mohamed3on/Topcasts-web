import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

import {
  upsertEpisode,
  upsertEpisodeUrl,
  upsertPodcastDetails,
} from '../app/api/episode/db';
import {
  cleanUrl,
  determineType,
  getCheerio,
  getHtml,
  scrapeDataByType,
  slugifyDetails,
} from '../app/api/episode/utils';
import { ScrapedEpisodeData, ScrapedEpisodeDetails } from '../app/api/types';
// @ts-ignore
import tweetData from './url_to_tweets.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function getTimFerrissEpisodeLinks(url: string) {
  const html = await getHtml(url);
  const $ = await getCheerio(html);

  let allLinks = $('article .listen-anywhere-sources a');

  if (!allLinks.length) {
    allLinks = $('a.podcast-block__link');
  }

  const appleLink = allLinks
    .filter('[href*=".apple.com"]')
    .attr('href')
    ?.replace('itunes.apple.com', 'podcasts.apple.com');

  const spotifyLink = allLinks
    .filter('[href*="open.spotify.com/episode"]')
    .attr('href');

  if (!appleLink && !spotifyLink) {
    return null;
  }

  console.log('Apple:', appleLink);
  console.log('Spotify:', spotifyLink);

  return {
    appleLink,
    spotifyLink,
  };
}

async function getHubermanLabEpisodeLinks(url: string) {
  const html = await getHtml(url);
  const $ = await getCheerio(html);

  const appleLink = $('a.chip-platform[href*="podcasts.apple.com"]').attr(
    'href',
  );
  const spotifyLink = $(
    'a.chip-platform[href*="open.spotify.com/episode"]',
  ).attr('href');

  return {
    appleLink,
    spotifyLink,
  };
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
      image_url: scrapedData.image_url,
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
  const tweetEntries = Object.entries(tweetData);

  await Promise.all(
    tweetEntries.map(async ([url, urlShares]) => {
      let shouldProcess = false;

      for (const tweet of urlShares.tweets) {
        const { error } = await supabase
          .from('social_share')
          .select('episode_id')
          .eq('tweet_id', tweet.tweet_id)
          .single();

        if (error) {
          shouldProcess = true;
          break;
        }
      }

      if (!shouldProcess) {
        return;
      }
      if (url.includes('hubermanlab.com')) {
        console.log(chalk.yellow('🔍 Scraping Huberman Lab episode links...'));
        console.log(chalk.yellow('🔗 URL:'), chalk.blue(url));
        const links = await getHubermanLabEpisodeLinks(url);
        console.log('🚀 ~ tweetEntries.map ~ links:', links);

        let id;
        if (links?.spotifyLink) {
          id = await handleEpisodeURL(links.spotifyLink, urlShares.tweets);
        } else if (links?.appleLink) {
          id = await handleEpisodeURL(links.appleLink, urlShares.tweets);
        }

        if (id) {
          if (links?.appleLink && links?.spotifyLink) {
            await upsertEpisodeUrl(supabase, links.appleLink, id, 'apple');
            await upsertEpisodeUrl(supabase, links.spotifyLink, id, 'spotify');
          }
        } else {
          console.log(
            chalk.red('❌ No valid links found for Huberman Lab episode:'),
            chalk.blue(url),
          );
        }
        return;
      }
      // if tim ferris link, get the apple/spotify urls
      if (url.includes('tim.blog')) {
        console.log(chalk.yellow('🔍 Scraping Tim Ferriss episode links...'));
        console.log(chalk.yellow('🔗 URL:'), chalk.blue(url));

        const links = await getTimFerrissEpisodeLinks(url);
        if (links?.appleLink) {
          const id = await handleEpisodeURL(links.appleLink, urlShares.tweets);
          if (links?.spotifyLink)
            await upsertEpisodeUrl(supabase, links.spotifyLink, id, 'spotify');
        } else {
          console.log(
            chalk.red('❌ No links found for Tim Ferriss episode:'),
            chalk.blue(url),
          );
          return;
        }
      } else await handleEpisodeURL(url, urlShares.tweets);
    }),
  );
}

const handleEpisodeURL = async (
  url: string,
  tweets: {
    screen_name: string;
    created_at: string;
    tweet_id: string;
    tweet_text: string;
  }[],
) => {
  const cleanedUrl = cleanUrl(url);
  console.log(chalk.yellow('🚀 Processing URL:'), chalk.blue(cleanedUrl));
  const type = determineType(cleanedUrl);
  if (!type) {
    console.error('❌ Failed to determine type for URL:', cleanedUrl);
    return;
  }

  const { data } = await supabase
    .from('podcast_episode_url')
    .select('episode_id')
    .eq('url', cleanedUrl)
    .single();

  let id = data?.episode_id;

  if (!data) {
    console.log(chalk.yellow('🔍 Scraping episode details for ', cleanedUrl));
    let scrapedData: ScrapedEpisodeDetails;
    try {
      scrapedData = await scrapeDataByType(type, cleanedUrl);
    } catch (error) {
      console.error(chalk.red('❌ Error scraping data:'), error);
      return;
    }

    const response = await updateEpisodeDetails({
      type,
      cleanedUrl,
      scrapedData,
    });

    if ('error' in response) {
      console.error('❌ Error updating episode details:', response.error);
      return;
    }

    id = response.id;
    console.log(
      chalk.green('🆕 Scraped episode:'),
      chalk.magenta(scrapedData.episode_name),
      cleanedUrl,
    );
  } else {
    console.log(chalk.green('🔍 Found episode ID:'), chalk.magenta(id));
  }

  const dataToUpsert = tweets.map((tweet) => ({
    episode_id: id,
    twitter_screen_name: tweet.screen_name,
    shared_at: new Date(tweet.created_at).toISOString(),
    tweet_id: tweet.tweet_id,
    tweet_text: tweet.tweet_text,
  }));

  const { data: social_add_data, error: socialAddError } = await supabase
    .from('social_share')
    .upsert(dataToUpsert);

  if (socialAddError) {
    console.error(chalk.red('❌ Error inserting social data:'), socialAddError);
  }

  console.log(chalk.green('✅ Inserted social data for episode ID:'), id);

  return id;
};

// @ts-ignore
await processTweets();
