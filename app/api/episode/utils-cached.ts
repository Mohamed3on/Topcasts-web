import { unstable_cache } from 'next/cache';
import { scrapeDataByType } from './utils';

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
