import { unstable_cache } from 'next/cache';
import {
  scrapeApplePodcastsEpisodeDetails,
  scrapeCastroEpisodeDetails,
  scrapeDataByType,
} from './utils';
import { getSpotifyEpisodeData } from './spotify';

// Cache Apple Podcasts scraping for 24 hours
export const getCachedAppleEpisode = unstable_cache(
  async (url: string) => {
    return await scrapeApplePodcastsEpisodeDetails(url);
  },
  ['apple-episode'],
  {
    tags: ['apple-episode'],
    revalidate: 86400, // 24 hours
  }
);

// Cache Castro scraping for 24 hours
export const getCachedCastroEpisode = unstable_cache(
  async (url: string) => {
    return await scrapeCastroEpisodeDetails(url);
  },
  ['castro-episode'],
  {
    tags: ['castro-episode'],
    revalidate: 86400,
  }
);

// Cache Spotify API calls for 24 hours
export const getCachedSpotifyEpisode = unstable_cache(
  async (episodeId: string) => {
    return await getSpotifyEpisodeData(episodeId);
  },
  ['spotify-episode'],
  {
    tags: ['spotify-episode'],
    revalidate: 86400,
  }
);

// Generic cached scraper
export const getCachedEpisodeData = unstable_cache(
  async (type: 'apple' | 'spotify' | 'castro', url: string) => {
    return await scrapeDataByType(type, url);
  },
  ['episode-scrape'],
  {
    tags: ['episode-scrape'],
    revalidate: 86400,
  }
);
