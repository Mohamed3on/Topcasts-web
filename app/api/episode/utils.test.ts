import { expect, test, describe } from 'bun:test';
import { cleanUrl, scrapeApplePodcastsEpisodeDetails } from './utils';

describe('cleanUrl', () => {
  test('cleans URL with podcast and episode IDs', () => {
    const input =
      'https://podcasts.apple.com/us/podcast/how-to-convince-biden-to-quit/id1743213122?i=1000661794526';
    const expected =
      'https://podcasts.apple.com/us/podcast/1743213122?i=1000661794526';
    expect(cleanUrl(input)).toBe(expected);
  });

  test('cleans URL with only podcast ID', () => {
    const input =
      'https://podcasts.apple.com/us/podcast/1504567418?i=1000666803198';
    const expected =
      'https://podcasts.apple.com/us/podcast/1504567418?i=1000666803198';
    expect(cleanUrl(input)).toBe(expected);
  });
});

describe('scrapeApplePodcastsEpisodeDetails', () => {
  test('extracts podcast ID from URL with id prefix', async () => {
    const mockHtml = `
      <html>
        <div class="content-container">
          <h1 class="headings__title">Test Episode</h1>
          <div class="subtitle-action"><a>Test Podcast</a></div>
          <div class="paragraph-wrapper">Description</div>
          <source type="image/jpeg" srcset="https://example.com/image.jpg 1200w" />
        </div>
        <div data-testid="information">
          <li>Published<span class="content">October 2, 2025</span></li>
          <li>Length<span class="content">1h 30m</span></li>
        </div>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = async () => ({ text: async () => mockHtml }) as any;

    const result = await scrapeApplePodcastsEpisodeDetails(
      'https://podcasts.apple.com/us/podcast/theres-a-cheap-and-low-tech-way/id1245002988?i=1000729733247'
    );

    global.fetch = originalFetch;

    expect(result.podcast_itunes_id).toBe('1245002988');
    expect(result.episode_itunes_id).toBe('1000729733247');
  });

  test('extracts podcast ID from cleaned URL format', async () => {
    const mockHtml = `
      <html>
        <div class="content-container">
          <h1 class="headings__title">Test Episode</h1>
          <div class="subtitle-action"><a>Test Podcast</a></div>
          <div class="paragraph-wrapper">Description</div>
          <source type="image/jpeg" srcset="https://example.com/image.jpg 1200w" />
        </div>
        <div data-testid="information">
          <li>Published<span class="content">October 2, 2025</span></li>
          <li>Length<span class="content">1h 30m</span></li>
        </div>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = async () => ({ text: async () => mockHtml }) as any;

    const result = await scrapeApplePodcastsEpisodeDetails(
      'https://podcasts.apple.com/us/podcast/1245002988?i=1000729733247'
    );

    global.fetch = originalFetch;

    expect(result.podcast_itunes_id).toBe('1245002988');
    expect(result.episode_itunes_id).toBe('1000729733247');
  });

  test('extracts artist name from JSON-LD schema', async () => {
    const mockHtml = `
      <html>
        <div class="content-container">
          <h1 class="headings__title">Test Episode</h1>
          <div class="subtitle-action"><a>Test Podcast</a></div>
          <div class="paragraph-wrapper">Description</div>
          <source type="image/jpeg" srcset="https://example.com/image.jpg 1200w" />
        </div>
        <div data-testid="information">
          <li>Published<span class="content">October 2, 2025</span></li>
          <li>Length<span class="content">1h 30m</span></li>
        </div>
        <script id="schema:episode" type="application/ld+json">
          {"@context":"http://schema.org","@type":"PodcastEpisode","productionCompany":"Rob, Luisa, and the 80000 Hours team","name":"Test Episode"}
        </script>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = async () => ({ text: async () => mockHtml }) as any;

    const result = await scrapeApplePodcastsEpisodeDetails(
      'https://podcasts.apple.com/us/podcast/1245002988?i=1000729733247'
    );

    global.fetch = originalFetch;

    expect(result.artist_name).toBe('Rob, Luisa, and the 80000 Hours team');
  });

  test('handles missing artist name gracefully', async () => {
    const mockHtml = `
      <html>
        <div class="content-container">
          <h1 class="headings__title">Test Episode</h1>
          <div class="subtitle-action"><a>Test Podcast</a></div>
          <div class="paragraph-wrapper">Description</div>
          <source type="image/jpeg" srcset="https://example.com/image.jpg 1200w" />
        </div>
        <div data-testid="information">
          <li>Published<span class="content">October 2, 2025</span></li>
          <li>Length<span class="content">1h 30m</span></li>
        </div>
      </html>
    `;

    const originalFetch = global.fetch;
    global.fetch = async () => ({ text: async () => mockHtml }) as any;

    const result = await scrapeApplePodcastsEpisodeDetails(
      'https://podcasts.apple.com/us/podcast/1245002988?i=1000729733247'
    );

    global.fetch = originalFetch;

    expect(result.artist_name).toBeUndefined();
  });
});
