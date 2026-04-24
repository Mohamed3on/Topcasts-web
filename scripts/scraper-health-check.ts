import {
  scrapeApplePodcastsEpisodeDetails,
  scrapeCastroEpisodeDetails,
  scrapeSpotifyEpisodeDetails,
} from '../app/api/episode/utils';

const CHECKS = [
  {
    name: 'Apple Podcasts',
    url: 'https://podcasts.apple.com/us/podcast/making-the-best-iphone-camera-app-with-ben-sandofsky/id1723943281?i=1000751014946',
    scrape: scrapeApplePodcastsEpisodeDetails,
    required: ['episode_name', 'podcast_name', 'image_url', 'duration'] as const,
  },
  {
    name: 'Castro',
    url: 'https://castro.fm/episode/ng9KUk',
    scrape: scrapeCastroEpisodeDetails,
    required: ['episode_name', 'podcast_name', 'image_url', 'duration'] as const,
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/episode/5dSrm8LYeFAgc6ZbuoRvVE',
    scrape: scrapeSpotifyEpisodeDetails,
    required: ['episode_name', 'podcast_name', 'image_url', 'artist_name', 'duration'] as const,
  },
];

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

async function runCheck(check: (typeof CHECKS)[number]) {
  try {
    const data = (await check.scrape(check.url)) as Record<string, unknown>;
    const missing = check.required.filter((f) => !data[f]);
    if (missing.length) {
      await sendAlert(
        `🔴 Scraper health check FAILED: ${check.name}\nMissing fields: ${missing.join(', ')}`,
      );
      return false;
    }
    console.log(`✓ ${check.name} — ${data.episode_name}`);
    return true;
  } catch (e) {
    await sendAlert(
      `🔴 Scraper health check FAILED: ${check.name}\n${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

const results = await Promise.all(CHECKS.map(runCheck));

if (results.some((r) => !r)) {
  process.exit(1);
}
console.log('\nAll scraper health checks passed.');
