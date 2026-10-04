import { describe, expect, test } from 'bun:test';

import {
  askJev,
  type AskJev,
  type CandidateEpisode,
  findCodeMatch,
  findFeedGuid,
  isInFeed,
  matchWithJev,
  parseFeedItems,
  plainText,
  publishersAgree,
  sameEpisodeQuestions,
  shortlist,
  showNameKey,
  titleKey,
} from './identity';

const feedItem = (guid: string, title: string, date: string | null = null) => ({
  guid,
  title,
  date,
  duration: null,
  block: '',
});

describe('titleKey', () => {
  test("drops Spotify's show suffix, case, accents and punctuation", () => {
    expect(titleKey('Steve Young - [Glue Guys, EP.6]')).toBe('steve young');
    expect(titleKey('Mbappé’s Real Madrid: Rebuild!')).toBe(
      'mbappe s real madrid rebuild',
    );
  });

  test('keeps episode numbers and non-Latin titles', () => {
    expect(titleKey('#217 Estée Lauder')).not.toBe(
      titleKey('#361 Estée Lauder'),
    );
    expect(titleKey('日本語ポッドキャスト 第1回')).toBe(
      '日本語ポッドキャスト 第1回',
    );
  });
});

describe('findFeedGuid', () => {
  const items = [
    feedItem('g1', 'The Diamond Necklace Scandal (Part 2)', '2024-07-29'),
    feedItem('g2', 'Changing Our Mental Maps', '2021-01-04'),
    feedItem('g3', 'Changing Our Mental Maps', '2023-06-12'),
  ];

  test('matches a unique title whose date agrees or is unknown', () => {
    const episode = { title: 'The Diamond Necklace Scandal (Part 2)' };
    expect(findFeedGuid(items, episode)).toBe('g1');
    expect(findFeedGuid(items, { ...episode, date: '2024-07-30' })).toBe('g1');
  });

  test('refuses a date more than 3 days off', () => {
    const episode = {
      title: 'The Diamond Necklace Scandal (Part 2)',
      date: '2024-09-01',
    };
    expect(findFeedGuid(items, episode)).toBeUndefined();
  });

  test('ignores a GUID the feed reuses for other episodes', () => {
    const reusing = [
      feedItem('same', 'Episode One'),
      feedItem('same', 'Episode Two'),
    ];
    expect(findFeedGuid(reusing, { title: 'Episode One' })).toBeUndefined();
  });

  test('leaves reruns with the same title to the date', () => {
    expect(
      findFeedGuid(items, { title: 'Changing Our Mental Maps' }),
    ).toBeUndefined();
    expect(
      findFeedGuid(items, {
        title: 'Changing Our Mental Maps',
        date: '2023-06-12',
      }),
    ).toBe('g3');
  });
});

describe('findCodeMatch', () => {
  const stored: CandidateEpisode[] = [
    { id: 1, title: 'Kevin Nealon', date: '2021-03-01', guid: 'a' },
    { id: 2, title: 'Play Free - [Glue Guys, EP.8]', duration: 4_380_000 },
    { id: 3, title: 'Mania for Subjugation', date: '2023-01-10' },
  ];

  test('prefers the feed GUID over titles', () => {
    expect(
      findCodeMatch({ title: 'Something else', guid: 'a' }, stored)?.id,
    ).toBe(1);
  });

  test('matches a cleaned title when nothing contradicts it', () => {
    expect(
      findCodeMatch({ title: 'Play Free', duration: 4_400_000 }, stored)?.id,
    ).toBe(2);
  });

  test('a different GUID, date or length means a different episode', () => {
    expect(
      findCodeMatch({ title: 'Kevin Nealon', guid: 'b' }, stored),
    ).toBeUndefined();
    expect(
      findCodeMatch(
        { title: 'Mania for Subjugation', date: '2024-08-20' },
        stored,
      ),
    ).toBeUndefined();
    expect(
      findCodeMatch({ title: 'Play Free', duration: 1_000_000 }, stored),
    ).toBeUndefined();
  });
});

describe('shortlist', () => {
  const stored: CandidateEpisode[] = [
    { id: 1, title: 'Dr. Jim Loehr: What it Takes to Win', date: '2024-04-30' },
    { id: 2, title: 'Dr. Jim Loehr: The Power of Story', date: '2022-01-10' },
    {
      id: 3,
      title: 'Your Personality Created Your Personal Reality',
      duration: 3_600_000,
    },
    {
      id: 4,
      title: 'Dr. Jim Loehr on resilience',
      urls: [
        { type: 'spotify', url: 'https://open.spotify.com/episode/OTHER' },
      ],
    },
    { id: 5, title: 'Dr. Jim Loehr: Changing stories', guid: 'x' },
  ];
  const episode = {
    title: '#193: Dr. Jim Loehr: Change the Stories You Tell Yourself',
    date: '2024-04-30',
    duration: 3_605_000,
    guid: 'y',
  };
  const source = {
    type: 'spotify',
    url: 'https://open.spotify.com/episode/NEW',
  };

  test('keeps title overlaps and same-length episodes, drops clear non-matches', () => {
    const ids = shortlist(episode, stored, source).map((c) => c.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3); // retitled beyond recognition, but the same length
    expect(ids).not.toContain(2); // published two years earlier
    expect(ids).not.toContain(4); // already holds another Spotify episode
    expect(ids).not.toContain(5); // a different feed GUID
  });
});

describe('matchWithJev', () => {
  const episode = { title: 'Lue Elizondo Speaks With Curt Jaimungal' };
  const candidates = [
    {
      id: 10,
      title: "Lue Elizondo: Pentagon's UFO Investigator Breaks 2 Year Silence",
    },
    { id: 11, title: 'The Best of Lue Elizondo', date: '2024-09-01' },
  ];
  const answering =
    (probabilities: Record<string, number>): AskJev =>
    async () =>
      probabilities;

  test('accepts a candidate only when both directions clear 0.8', async () => {
    const both = answering({ c0: 0.89, r0: 0.86, c1: 0.2, r1: 0.1 });
    expect((await matchWithJev(episode, candidates, both))?.id).toBe(10);

    const oneWay = answering({ c0: 0.81, r0: 0.26, c1: 0.2, r1: 0.1 });
    expect(await matchWithJev(episode, candidates, oneWay)).toBeUndefined();
  });

  test('breaks ties between confident candidates by closeness', async () => {
    const dated = { ...episode, date: '2024-09-02' };
    const both = answering({ c0: 0.95, r0: 0.95, c1: 0.85, r1: 0.9 });
    expect((await matchWithJev(dated, candidates, both))?.id).toBe(11);
  });

  test('falls back to no match when Jev is unavailable', async () => {
    expect(
      await matchWithJev(episode, candidates, async () => null),
    ).toBeUndefined();
  });

  test('sends both episodes in full with the gaps bucketed', async () => {
    let sent: Parameters<AskJev>[1] = {};
    await matchWithJev(
      {
        title: 'A',
        description: '<p>Show &amp; notes</p>',
        duration: 3_600_000,
      },
      [{ id: 1, title: 'B', description: 'Other notes', duration: 3_700_000 }],
      async (_state, questions) => {
        sent = questions;
        return {};
      },
    );
    expect(Object.keys(sent)).toEqual(['c0', 'r0']);
    expect(sent.c0.instructions).toMatchObject({
      new_episode: { title: 'A', description: 'Show & notes' },
      candidate: { title: 'B', description: 'Other notes' },
      publish_dates: 'unknown',
      durations: '1 to 3 minutes apart',
    });
    expect(sent.r0.instructions).toMatchObject({
      new_episode: { title: 'B' },
      candidate: { title: 'A' },
    });
  });

  test('drops the lowest-ranked candidates a request cannot hold', () => {
    const long = 'x'.repeat(6000);
    const many = Array.from({ length: 11 }, (_, i) => ({
      title: `Candidate ${i}`,
      description: '語'.repeat(6000),
    }));
    const questions = sameEpisodeQuestions(
      { title: 'New', description: long },
      many,
    );
    const kept = Object.keys(questions).length / 2;
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(11);
    expect(questions).toHaveProperty('c0');
  });
});

describe('askJev', () => {
  test('returns null without a key, sending nothing', async () => {
    const originalKey = process.env.TYPESAFE_API_KEY;
    const originalFetch = globalThis.fetch;
    delete process.env.TYPESAFE_API_KEY;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as unknown as typeof fetch;
    try {
      expect(await askJev({}, {})).toBeNull();
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey) process.env.TYPESAFE_API_KEY = originalKey;
    }
  });

  test('retries a server error once and reads each noul', async () => {
    const originalKey = process.env.TYPESAFE_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.TYPESAFE_API_KEY = 'test-key';
    const responses = [
      new Response('busy', { status: 503 }),
      Response.json({ answers: { c0: { type: 'noul', noul: 0.91 } } }),
    ];
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      request = init;
      return responses.shift()!;
    }) as unknown as typeof fetch;
    try {
      expect(await askJev({ podcast: 'P' }, {})).toEqual({ c0: 0.91 });
      expect(JSON.parse(String(request?.body)).model).toBe('jev-1.13.0');
      expect(responses).toHaveLength(0);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey) process.env.TYPESAFE_API_KEY = originalKey;
      else delete process.env.TYPESAFE_API_KEY;
    }
  });
});

describe('parseFeedItems', () => {
  test('reads GUID, title, date and length from RSS items', () => {
    const xml = `<rss><channel><title>Show</title>
      <item><title><![CDATA[Part 2: Q&amp;A]]></title><guid isPermaLink="false">abc-1</guid>
        <pubDate>Mon, 29 Jul 2024 04:00:00 GMT</pubDate><itunes:title>Ignored</itunes:title>
        <itunes:duration>01:02:03</itunes:duration>
        <description>&lt;p&gt;Notes &amp; links&lt;/p&gt;</description></item>
      <item><title>No GUID</title></item>
    </channel></rss>`;
    const [item, ...rest] = parseFeedItems(xml);
    expect(rest).toHaveLength(0);
    expect(item).toMatchObject({
      guid: 'abc-1',
      title: 'Part 2: Q&A',
      date: '2024-07-29',
      duration: 3_723_000,
    });
    expect(
      plainText(item.block.match(/<description>([\s\S]*)<\/description>/)![1]),
    ).toBe('Notes & links');
  });
});

describe('shows', () => {
  test('names agree before any subtitle', () => {
    expect(
      showNameKey('The Official SaaStr Podcast: SaaS | Founders | Investors'),
    ).toBe(showNameKey('The Official Saastr Podcast'));
    expect(showNameKey('Game Changer - the game theory podcast')).toBe(
      'game changer',
    );
    // Same start, but the feed check is what keeps these apart
    expect(showNameKey('The Rest Is Politics: US')).toBe(
      showNameKey('The Rest Is Politics'),
    );
  });

  test('publishers agree when one name holds all of the other\'s words', () => {
    expect(publishersAgree('TED', 'TED Audio Collective')).toBe(true);
    expect(publishersAgree('SaaStr', 'saastr')).toBe(true);
    expect(publishersAgree('Ted', 'United States')).toBe(false);
    expect(publishersAgree('SaaStr', null)).toBe(false);
  });

  test('an episode is in a feed by GUID, or by a unique title with agreeing dates', () => {
    const items = [
      feedItem('g1', 'Play Free', '2024-10-17'),
      feedItem('g2', 'Urban Meyer: Selfless Teams', '2024-10-10'),
    ];
    expect(isInFeed(items, { title: 'Renamed later', guid: 'g2' })).toBe(true);
    expect(
      isInFeed(items, { title: 'Play Free - [Glue Guys, EP.8]', date: '2024-10-17' }),
    ).toBe(true);
    expect(isInFeed(items, { title: 'Play Free', date: '2024-11-30' })).toBe(false);
    expect(isInFeed(items, { title: 'Steve Young' })).toBe(false);
  });
});
