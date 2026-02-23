import {
  scrapeApplePodcastsEpisodeDetails,
  scrapeCastroEpisodeDetails,
} from '../app/api/episode/utils';
import { getSpotifyEpisodeData } from '../app/api/episode/spotify';

const TEST_URLS = {
  apple:
    'https://podcasts.apple.com/us/podcast/making-the-best-iphone-camera-app-with-ben-sandofsky/id1723943281?i=1000751014946',
  castro: 'https://castro.fm/episode/ng9KUk',
  spotify: '5dSrm8LYeFAgc6ZbuoRvVE',
};

const REQUIRED_FIELDS = [
  'episode_name',
  'podcast_name',
  'image_url',
  'duration',
] as const;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendAlert(msg: string) {
  console.error(msg);
  if (!BOT_TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg }),
  }).catch(() => {});
}

type Result = Record<string, unknown>;

async function check(name: string, fn: () => Promise<Result>) {
  try {
    const data = await fn();
    const missing = REQUIRED_FIELDS.filter((f) => !data[f]);
    if (missing.length) {
      await sendAlert(
        `🔴 Scraper health check FAILED: ${name}\nMissing fields: ${missing.join(', ')}`,
      );
      return false;
    }
    console.log(`✓ ${name} — ${(data as any).episode_name}`);
    return true;
  } catch (e) {
    await sendAlert(
      `🔴 Scraper health check FAILED: ${name}\n${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

const results = await Promise.all([
  check('Apple Podcasts', () =>
    scrapeApplePodcastsEpisodeDetails(TEST_URLS.apple),
  ),
  check('Castro', () => scrapeCastroEpisodeDetails(TEST_URLS.castro)),
  check('Spotify', () =>
    getSpotifyEpisodeData(TEST_URLS.spotify) as Promise<Result>,
  ),
]);

if (results.some((r) => !r)) {
  process.exit(1);
}
console.log('\nAll scraper health checks passed.');
