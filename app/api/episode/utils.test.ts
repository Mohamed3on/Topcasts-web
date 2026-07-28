import { expect, test, describe } from 'bun:test';
import { cleanUrl, validateImageUrl } from './utils';

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

describe('validateImageUrl', () => {
  test('accepts an image response from any hostname', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(null, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })) as typeof fetch;

    try {
      expect(
        await validateImageUrl(
          'https://thisamericanlife.org/artwork/podcast.png',
        ),
      ).toBe('valid');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('rejects a successful response that is not an image', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(null, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as typeof fetch;

    try {
      expect(await validateImageUrl('https://example.com/not-an-image')).toBe(
        'invalid',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('treats transient fetch failures as unknown', async () => {
    const originalFetch = globalThis.fetch;
    const originalWarn = console.warn;
    globalThis.fetch = (async () => {
      throw new Error('network unavailable');
    }) as typeof fetch;
    console.warn = () => {};

    try {
      expect(await validateImageUrl('https://example.com/image.png')).toBe(
        'unknown',
      );
    } finally {
      globalThis.fetch = originalFetch;
      console.warn = originalWarn;
    }
  });
});
