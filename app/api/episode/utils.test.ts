import { expect, test, describe } from 'bun:test';
import { cleanUrl } from './utils';

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
