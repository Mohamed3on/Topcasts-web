import { expect, test } from 'bun:test';

import {
  scrapeApplePodcastsEpisodeDetails,
  scrapeCastroEpisodeDetails,
} from './utils';

type ITunesLookupResponse = {
  resultCount: number;
  results: Array<{
    collectionId: number;
    artistName?: string;
    artworkUrl600?: string;
    artworkUrl1000?: string;
  }>;
};

test('fetches real Apple metadata for podcast 1711415224', async () => {
  const response = await fetch(
    'https://itunes.apple.com/lookup?id=1711415224&media=podcast',
  );

  expect(response.ok).toBe(true);

  const json = (await response.json()) as ITunesLookupResponse;

  expect(json.resultCount).toBeGreaterThan(0);
  const podcast = json.results[0];

  expect(podcast.collectionId).toBe(1711415224);
  expect(typeof podcast.artistName).toBe('string');
  expect(podcast.artistName?.length ?? 0).toBeGreaterThan(0);

  const artworkUrl = podcast.artworkUrl1000 ?? podcast.artworkUrl600 ?? null;

  expect(typeof artworkUrl).toBe('string');
  expect(artworkUrl).toMatch(/^https:\/\/.*\.(jpg|png)$/i);
});

test('scrapes Apple episode details with enriched metadata', async () => {
  const result = await scrapeApplePodcastsEpisodeDetails(
    'https://podcasts.apple.com/us/podcast/how-to-bring-down-healthcare-costs/id1711415224?i=1000729692108',
  );

  expect(result.podcast_itunes_id).toBe('1711415224');
  expect(result.episode_itunes_id).toBe('1000729692108');
  expect(result.artist_name).toBe('Santi Ruiz');
  expect(result.podcast_genres).toBeDefined();
  expect(result.podcast_genres).toContain('Politics');
  expect(result.rss_feed).toBe(
    'https://api.substack.com/feed/podcast/1818323.rss',
  );
  expect(result.image_url).toMatch(/^https:\/\/.*\.(jpg|png)$/i);
  expect(result.episode_name).toBe('How to Bring Down Healthcare Costs');
  expect(typeof result.description).toBe('string');
});

test('scrapes Castro episode details and hydrates metadata via Apple', async () => {
  const result = await scrapeCastroEpisodeDetails(
    'https://castro.fm/episode/PYl01A',
  );

  // Core episode fields from Castro HTML
  expect(result.episode_name).toBe(
    "Why We Don't Build Apartments for Families",
  );
  expect(result.podcast_name).toBeTruthy();
  expect(typeof result.description).toBe('string');
  expect(result.description!.length).toBeGreaterThan(0);
  expect(result.image_url).toMatch(/^https:\/\/.*\.(jpg|png|jpeg)$/i);
  expect(result.duration).toBeGreaterThan(0);
  expect(result.date_published).toBeTruthy();
  expect(result.audio_url).toMatch(/^https:\/\/.*$/);
  expect(result.rss_feed).toBe(
    'https://api.substack.com/feed/podcast/1818323.rss',
  );

  // Apple-hydrated metadata
  expect(result.podcast_itunes_id).toBe('1711415224');
  expect(result.artist_name).toBe('Santi Ruiz');
  expect(result.podcast_genres).toBeDefined();
  expect(result.podcast_genres).toContain('Politics');

  // Castro doesn't resolve episode-level iTunes IDs
  expect(result.episode_itunes_id).toBeUndefined();
});

test('scrapes Castro episode with all fields populated', async () => {
  const result = await scrapeCastroEpisodeDetails(
    'https://castro.fm/episode/tKdldz',
  );

  // Image (the field that broke when Castro redesigned)
  expect(result.image_url).toMatch(/^https:\/\/.*\.(jpg|png|jpeg)$/i);

  // Core scraped fields
  expect(result.episode_name).toBeTruthy();
  expect(result.podcast_name).toBeTruthy();
  expect(typeof result.description).toBe('string');
  expect(result.description!.length).toBeGreaterThan(0);
  expect(result.duration).toBeGreaterThan(0);
  expect(result.date_published).toBeTruthy();
  expect(result.audio_url).toMatch(/^https:\/\/.*$/);
  expect(result.rss_feed).toMatch(/^https:\/\/.*$/);
  expect(result.podcast_itunes_id).toBeTruthy();
});
