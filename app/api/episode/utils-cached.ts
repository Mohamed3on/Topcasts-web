import { unstable_cache } from 'next/cache';
import { scrapeDataByType } from './utils';

// Generic cached scraper. Throws on a scrape with no episode name so the
// failure is NOT cached — otherwise a transient upstream outage would poison
// the URL for the whole revalidate window.
export const getCachedEpisodeData = unstable_cache(
  async (type: 'apple' | 'spotify' | 'castro', url: string) => {
    const data = await scrapeDataByType(type, url);
    if (!data.episode_name) {
      throw new Error('Episode does not exist or could not be scraped');
    }
    return data;
  },
  ['episode-scrape'],
  {
    tags: ['episode-scrape'],
    revalidate: 86400,
  }
);
