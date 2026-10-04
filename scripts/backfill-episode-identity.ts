/**
 * One-time (re-runnable) backfill for cross-platform episode identity.
 *
 *  1. Podcasts get their RSS feed, which carries the episode GUIDs: by Apple
 *     ID when known, else Spotify-only shows are matched to Apple in code on
 *     name + publisher via iTunes Search (paced; Apple 403s bursts). A show
 *     whose Apple ID or feed another row already holds is that row's
 *     duplicate, and is merged into it.
 *  2. Episodes lacking a GUID get one from the feed: a unique title match in
 *     code, else Jev on a shortlist of feed items (a single confident pick).
 *  3. Episodes of a podcast that share a GUID are merged: URLs, reviews and
 *     social shares move onto the oldest row, which then fills its gaps.
 *
 *   bun scripts/backfill-episode-identity.ts [--expect labeled.json]
 *     Dry run: writes data/backfill/plan.json and prints what would change.
 *   bun scripts/backfill-episode-identity.ts --apply
 *     Re-checks the plan against the database, backs every affected row up to
 *     data/backups/, applies it in one transaction, verifies the counts and
 *     revalidates the site's caches.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, TYPESAFE_API_KEY, and
 * SUPABASE_ACCESS_TOKEN or a `supabase login` (the transaction goes through
 * the Management API, since PostgREST can't span one). REVALIDATE_SECRET and
 * NEXT_PUBLIC_HOST to refresh cached pages afterwards.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdir } from 'node:fs/promises';

import {
  askJev,
  feedItemDescription,
  type FeedItem,
  findFeedGuid,
  JEV_THRESHOLD,
  matchWithJev,
  parseFeedItems,
  shortlist,
  titleKey,
} from '../app/api/episode/identity';

const APPLY = process.argv.includes('--apply');
const EXPECT = process.argv.includes('--expect')
  ? process.argv[process.argv.indexOf('--expect') + 1]
  : undefined;
const DIR = 'data/backfill';
const PLAN = `${DIR}/plan.json`;
const PROJECT_REF = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
).hostname.split('.')[0];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Podcast = {
  id: number;
  name: string;
  itunes_id: string | null;
  spotify_id: string | null;
  castro_id: string | null;
  rss_feed: string | null;
  artist_name: string | null;
  genres: string[] | null;
};
type Episode = {
  id: number;
  podcast_id: number;
  episode_name: string;
  date_published: string | null;
  duration: number | null;
  guid: string | null;
};
type Plan = {
  createdAt: string;
  podcastUpdates: {
    id: number;
    itunes_id: string;
    rss_feed: string;
    genres: string[];
  }[];
  podcastMerges: { keeper: number; dup: number }[];
  guids: { episodeId: number; guid: string; via: 'code' | 'jev' }[];
  episodeMerges: { keeper: number; dups: number[]; guid: string }[];
  delta: Record<string, number>;
};

async function readAll<T>(
  table: string,
  columns: string,
  order: string[],
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(columns);
    for (const column of order) query = query.order(column);
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    const raw = Bun.spawnSync([
      'security',
      'find-generic-password',
      '-s',
      'Supabase CLI',
      '-a',
      'supabase',
      '-w',
    ])
      .stdout.toString()
      .trim();
    token = raw.startsWith('go-keyring-base64:')
      ? Buffer.from(raw.slice(18), 'base64').toString()
      : raw;
  }
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!response.ok)
    throw new Error(`SQL ${response.status}: ${await response.text()}`);
  return response.json();
}

// ── 1. Feeds for podcasts ────────────────────────────────────────

type AppleShow = {
  id: string;
  name: string;
  artist: string;
  feed?: string;
  genres: string[];
  episodes: number;
};
const toShow = (r: Record<string, any>): AppleShow => ({
  id: String(r.collectionId),
  name: r.collectionName,
  artist: r.artistName,
  feed: r.feedUrl,
  genres: r.genres ?? [],
  episodes: r.trackCount ?? 0,
});

/** iTunes, paced: Apple 403s bursts. Null when still throttled after retries. */
async function itunes(url: string): Promise<Record<string, any>[] | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      await Bun.sleep(3500);
      return ((await response.json()) as { results: Record<string, any>[] })
        .results;
    }
    console.log(`  iTunes ${response.status} — waiting a minute`);
    await Bun.sleep(60_000);
  }
  return null;
}

const norm = (s?: string | null) => titleKey(s ?? '');
const head = (s: string) => norm(s.split(/\s[:|–—-]\s|:\s/)[0]);
const publishersAgree = (a?: string | null, b?: string | null) => {
  const [x, y] = [norm(a), norm(b)];
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

async function findFeeds(podcasts: Podcast[]) {
  const cacheFile = Bun.file(`${DIR}/itunes.json`);
  const cache: Record<string, Record<string, any>[]> =
    (await cacheFile.exists()) ? await cacheFile.json() : {};
  const call = async (url: string) => {
    cache[url] ??= (await itunes(url)) as Record<string, any>[];
    await Bun.write(cacheFile, JSON.stringify(cache));
    return cache[url];
  };
  const updates: Plan['podcastUpdates'] = [];
  const merges: Plan['podcastMerges'] = [];
  const report = {
    byAppleId: 0,
    bySearch: 0,
    merged: 0,
    noMatch: [] as string[],
    throttled: 0,
    conflicting: [] as string[],
  };
  const take = (podcast: Podcast, show: AppleShow) => {
    const planned = updates.find(
      (u) => u.itunes_id === show.id || u.rss_feed === show.feed,
    );
    if (planned) {
      report.conflicting.push(
        `${podcast.id} ${podcast.name} (same show as ${planned.id})`,
      );
      return false;
    }
    const holders = new Set(
      podcasts
        .filter(
          (p) =>
            p.id !== podcast.id &&
            ((!podcast.itunes_id && p.itunes_id === show.id) ||
              p.rss_feed === show.feed),
        )
        .map((p) => p.id),
    );
    if (holders.size === 0)
      return (
        updates.push({
          id: podcast.id,
          itunes_id: show.id,
          rss_feed: show.feed!,
          genres: show.genres,
        }),
        true
      );
    const [keeper] = holders;
    if (holders.size === 1 && !podcast.itunes_id)
      return (merges.push({ keeper, dup: podcast.id }), true);
    report.conflicting.push(
      `${podcast.id} ${podcast.name} (feed or Apple ID held by ${[...holders].join(', ')})`,
    );
    return false;
  };

  // Known Apple IDs: an exact lookup, 100 at a time.
  const appleOnly = podcasts.filter((p) => p.itunes_id && !p.rss_feed);
  for (let i = 0; i < appleOnly.length; i += 100) {
    const batch = appleOnly.slice(i, i + 100);
    const results = await call(
      `https://itunes.apple.com/lookup?entity=podcast&id=${batch.map((p) => p.itunes_id).join(',')}`,
    );
    if (!results) {
      report.throttled += batch.length;
      continue;
    }
    for (const podcast of batch) {
      const r = results.find(
        (r) => String(r.collectionId) === podcast.itunes_id,
      );
      if (r?.feedUrl && take(podcast, toShow(r))) report.byAppleId++;
    }
  }

  // Spotify-only shows: search by name, accept a name + publisher match.
  const spotifyOnly = podcasts.filter(
    (p) => p.spotify_id && !p.itunes_id && !p.castro_id,
  );
  for (const podcast of spotifyOnly) {
    const results = await call(
      `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=10&term=${encodeURIComponent(podcast.name)}`,
    );
    if (!results) {
      report.throttled++;
      continue;
    }
    const [hit] = results
      .map((r, rank) => ({ show: toShow(r), rank }))
      .filter(
        ({ show }) =>
          (norm(show.name) === norm(podcast.name) ||
            head(show.name) === head(podcast.name)) &&
          publishersAgree(show.artist, podcast.artist_name),
      )
      .sort((a, b) => b.show.episodes - a.show.episodes || a.rank - b.rank);
    if (!hit?.show.feed) {
      report.noMatch.push(
        `${podcast.id} ${podcast.name} (${podcast.artist_name})`,
      );
      continue;
    }
    if (take(podcast, hit.show)) report.bySearch++;
  }
  report.merged = merges.length;
  return { updates, merges, report };
}

// ── 2. Feed GUIDs ─────────────────────────────────────────────────

async function fetchFeed(url: string): Promise<FeedItem[] | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Topcasts)' },
    });
    return response.ok ? parseFeedItems(await response.text()) : null;
  } catch {
    return null;
  }
}

async function pool<T>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<void>,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) await run(items[next++]);
    }),
  );
}

const toFacts = (e: Episode) => ({
  title: e.episode_name,
  date: e.date_published,
  duration: e.duration,
  guid: e.guid,
});

async function assignGuids(
  episodes: Episode[],
  feedOf: Map<number, string>,
  podcastName: Map<number, string>,
) {
  const missing = episodes.filter((e) => !e.guid && feedOf.has(e.podcast_id));
  const byPodcast = Map.groupBy(missing, (e) => e.podcast_id);
  const assignments: Plan['guids'] = [];
  const withoutGuid = episodes.filter((e) => !e.guid).length;
  const report = {
    withoutGuid,
    feedless: withoutGuid - missing.length,
    feedFailed: 0,
    code: 0,
    jev: 0,
    unmatched: 0,
    jevCalls: 0,
    jevFailed: 0,
  };
  const needJev: { episode: Episode; items: FeedItem[] }[] = [];

  await pool([...byPodcast.keys()], 6, async (podcastId) => {
    const items = await fetchFeed(feedOf.get(podcastId)!);
    const own = byPodcast.get(podcastId)!;
    if (!items?.length) {
      report.feedFailed += own.length;
      return;
    }
    // A GUID a feed reuses for different titles identifies nothing.
    const titlesOf = Map.groupBy(items, (i) => i.guid);
    const usable = items.filter(
      (i) =>
        new Set(titlesOf.get(i.guid)!.map((x) => titleKey(x.title))).size === 1,
    );
    for (const episode of own) {
      const guid = findFeedGuid(items, toFacts(episode));
      if (guid) {
        assignments.push({ episodeId: episode.id, guid, via: 'code' });
        report.code++;
      } else needJev.push({ episode, items: usable });
    }
  });

  const descriptions = new Map<number, string | null>();
  for (let i = 0; i < needJev.length; i += 200) {
    const ids = needJev.slice(i, i + 200).map(({ episode }) => episode.id);
    const { data } = await supabase
      .from('podcast_episode')
      .select('id, description')
      .in('id', ids);
    for (const row of data ?? []) descriptions.set(row.id, row.description);
  }
  await pool(needJev, 4, async ({ episode, items }) => {
    const facts = {
      ...toFacts(episode),
      description: descriptions.get(episode.id),
    };
    const candidates = shortlist(facts, items).map((item) => ({
      ...item,
      description: feedItemDescription(item),
    }));
    if (!candidates.length) return void report.unmatched++;
    report.jevCalls++;
    // A feed may repeat an episode under the same title; only one confident pick counts.
    const confident = new Set<string>();
    await matchWithJev(
      facts,
      candidates,
      async (state, questions) => {
        const answers = await askJev(state, questions);
        if (!answers) report.jevFailed++;
        candidates.forEach((c, i) => {
          if (
            (answers?.[`c${i}`] ?? 0) >= JEV_THRESHOLD &&
            (answers?.[`r${i}`] ?? 0) >= JEV_THRESHOLD
          )
            confident.add(c.guid);
        });
        return answers;
      },
      { podcast: podcastName.get(episode.podcast_id) },
    );
    if (confident.size === 1) {
      assignments.push({
        episodeId: episode.id,
        guid: [...confident][0],
        via: 'jev',
      });
      report.jev++;
    } else report.unmatched++;
  });
  return { assignments, report };
}

// ── Plan ──────────────────────────────────────────────────────────

async function makePlan() {
  await mkdir(DIR, { recursive: true });
  const [podcasts, episodes, reviews, shares] = await Promise.all([
    readAll<Podcast>(
      'podcast',
      'id, name, itunes_id, spotify_id, castro_id, rss_feed, artist_name, genres',
      ['id'],
    ),
    readAll<Episode>(
      'podcast_episode',
      'id, podcast_id, episode_name, date_published, duration, guid',
      ['id'],
    ),
    readAll<{ episode_id: number; user_id: string }>(
      'podcast_episode_review',
      'id, episode_id, user_id',
      ['id'],
    ),
    readAll<{ episode_id: number; twitter_screen_name: string }>(
      'social_share',
      'episode_id, twitter_screen_name',
      ['episode_id', 'twitter_screen_name'],
    ),
  ]);
  console.log(
    `Loaded ${podcasts.length} podcasts, ${episodes.length} episodes, ${reviews.length} reviews, ${shares.length} social shares`,
  );

  console.log('\n1. Finding feeds (iTunes, paced)…');
  const feeds = await findFeeds(podcasts);
  const keeperOf = new Map(feeds.merges.map((m) => [m.dup, m.keeper]));
  const feedOf = new Map<number, string>();
  for (const p of podcasts) if (p.rss_feed) feedOf.set(p.id, p.rss_feed);
  for (const u of feeds.updates) feedOf.set(u.id, u.rss_feed);
  const homed = episodes.map((e) => ({
    ...e,
    podcast_id: keeperOf.get(e.podcast_id) ?? e.podcast_id,
  }));

  console.log('2. Matching episodes to feed GUIDs…');
  const podcastName = new Map(podcasts.map((p) => [p.id, p.name]));
  const { assignments, report: guidReport } = await assignGuids(
    homed,
    feedOf,
    podcastName,
  );

  // 3. Episodes of one podcast sharing a GUID are one episode.
  const guidOf = new Map(homed.map((e) => [e.id, e.guid]));
  for (const a of assignments) guidOf.set(a.episodeId, a.guid);
  const groups = Map.groupBy(
    homed.filter((e) => guidOf.get(e.id)),
    (e) => `${e.podcast_id} ${guidOf.get(e.id)}`,
  );
  const episodeMerges = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const [keeper, ...dups] = g.map((e) => e.id).sort((a, b) => a - b);
      return { keeper, dups, guid: guidOf.get(keeper)! };
    });
  const doomed = new Set(episodeMerges.flatMap((m) => m.dups));
  const hadGuid = new Set(episodes.filter((e) => e.guid).map((e) => e.id));
  const guids = assignments.filter((a) => !doomed.has(a.episodeId));

  // Same-user reviews and same-account shares collapse into one on merge.
  const keeperOfEpisode = new Map<number, number>(
    episodeMerges.flatMap((m) =>
      [m.keeper, ...m.dups].map((id) => [id, m.keeper] as [number, number]),
    ),
  );
  const collapsed = <T>(
    rows: T[],
    episodeOf: (r: T) => number,
    who: (r: T) => string,
  ) => {
    const seen = new Set<string>();
    let n = 0;
    for (const r of rows) {
      const keeper = keeperOfEpisode.get(episodeOf(r));
      if (keeper === undefined) continue;
      const key = `${keeper} ${who(r)}`;
      if (seen.has(key)) n++;
      else seen.add(key);
    }
    return n;
  };

  const plan: Plan = {
    createdAt: new Date().toISOString(),
    podcastUpdates: feeds.updates,
    podcastMerges: feeds.merges,
    guids,
    episodeMerges,
    delta: {
      podcasts: -feeds.merges.length,
      episodes: -doomed.size,
      urls: 0,
      reviews: -collapsed(
        reviews,
        (r) => r.episode_id,
        (r) => r.user_id,
      ),
      shares: -collapsed(
        shares,
        (s) => s.episode_id,
        (s) => s.twitter_screen_name,
      ),
      withGuid:
        guids.length - [...doomed].filter((id) => hadGuid.has(id)).length,
    },
  };
  await Bun.write(PLAN, JSON.stringify(plan, null, 1));

  // ── Report ──
  const f = feeds.report;
  console.log(
    `\nFeeds: ${f.byAppleId} podcasts by Apple ID, ${f.bySearch} Spotify-only shows by name + publisher; ${f.merged} of those are another row's duplicate (merged)`,
  );
  console.log(
    `  no confident Apple match: ${f.noMatch.length}; throttled: ${f.throttled}; conflicting: ${f.conflicting.length}`,
  );
  for (const c of f.conflicting) console.log(`  conflict: ${c}`);
  for (const m of plan.podcastMerges)
    console.log(
      `  merge podcast ${m.dup} "${podcastName.get(m.dup)}" → ${m.keeper} "${podcastName.get(m.keeper)}"`,
    );
  const g = guidReport;
  console.log(
    `\nGUIDs: ${g.withoutGuid} episodes lacked one (${g.feedless} in podcasts with no feed, ${g.feedFailed} whose feed failed); assigned ${g.code} by title, ${g.jev} by Jev (${g.jevCalls} calls, ${g.jevFailed} failed); ${g.unmatched} left unmatched`,
  );
  console.log(
    `\nEpisode merges: ${episodeMerges.length} groups, ${doomed.size} rows deleted after moving their URLs, reviews and shares`,
  );
  const title = new Map(episodes.map((e) => [e.id, e.episode_name]));
  const via = new Map(assignments.map((a) => [a.episodeId, a.via]));
  for (const m of episodeMerges)
    console.log(
      `  ${[m.keeper, ...m.dups].map((id) => `${id}[${hadGuid.has(id) ? 'had' : via.get(id)}] "${title.get(id)!.slice(0, 60)}"`).join('  ⇐  ')}`,
    );
  console.log(`\nChange on apply: ${JSON.stringify(plan.delta)}`);

  if (EXPECT) {
    const labelled = (
      (await Bun.file(EXPECT).json()) as {
        a: number;
        b: number;
        label: boolean;
      }[]
    ).filter((p) => p.label);
    const found = labelled.filter(
      (p) =>
        keeperOfEpisode.get(p.a) !== undefined &&
        keeperOfEpisode.get(p.a) === keeperOfEpisode.get(p.b),
    );
    const pairs = new Set(
      labelled.flatMap((p) => [`${p.a}/${p.b}`, `${p.b}/${p.a}`]),
    );
    const outside = episodeMerges.filter(
      (m) => !m.dups.some((d) => pairs.has(`${m.keeper}/${d}`)),
    );
    console.log(
      `\nAgainst ${labelled.length} hand-labelled duplicate pairs: ${found.length} merged; ${outside.length} merge groups are outside the labelled set`,
    );
    for (const p of labelled.filter((p) => !found.includes(p)))
      console.log(
        `  not merged: ${p.a} "${title.get(p.a)?.slice(0, 50)}" / ${p.b} "${title.get(p.b)?.slice(0, 50)}"`,
      );
  }
  console.log(`\nPlan written to ${PLAN}. Review it, then run with --apply.`);
}

// ── Apply ─────────────────────────────────────────────────────────

async function counts() {
  const [row] = await sql<Record<string, number>>(`select
    (select count(*) from podcast)::int as podcasts,
    (select count(*) from podcast_episode)::int as episodes,
    (select count(*) from podcast_episode_url)::int as urls,
    (select count(*) from podcast_episode_review)::int as reviews,
    (select count(*) from social_share)::int as shares,
    (select count(*) from podcast_episode where guid is not null)::int as "withGuid"`);
  return row;
}

async function apply() {
  const plan: Plan = await Bun.file(PLAN).json();
  const episodeIds = [
    ...new Set([
      ...plan.guids.map((a) => a.episodeId),
      ...plan.episodeMerges.flatMap((m) => [m.keeper, ...m.dups]),
    ]),
  ];
  const podcastIds = [
    ...new Set([
      ...plan.podcastUpdates.map((u) => u.id),
      ...plan.podcastMerges.flatMap((m) => [m.keeper, m.dup]),
    ]),
  ];
  const ids = (xs: number[]) => (xs.length ? xs.join(',') : 'null');
  const merged = plan.episodeMerges.flatMap((m) => [m.keeper, ...m.dups]);

  // The plan must still describe the database.
  const [check] = await sql<{
    present: number;
    guidded: number;
    podcasts: number;
  }>(`select
    (select count(*) from podcast_episode where id in (${ids(episodeIds)}))::int as present,
    (select count(*) from podcast_episode where id in (${ids(plan.guids.map((a) => a.episodeId))}) and guid is not null)::int as guidded,
    (select count(*) from podcast where id in (${ids(podcastIds)}))::int as podcasts`);
  if (
    check.present !== episodeIds.length ||
    check.guidded ||
    check.podcasts !== podcastIds.length
  )
    throw new Error(
      `Plan is stale (${JSON.stringify(check)}) — re-run the dry run`,
    );

  const before = await counts();
  const backup = {
    plan,
    before,
    podcasts: await sql(
      `select * from podcast where id in (${ids(podcastIds)})`,
    ),
    movedEpisodes: await sql(
      `select id, podcast_id from podcast_episode where podcast_id in (${ids(plan.podcastMerges.map((m) => m.dup))})`,
    ),
    episodes: await sql(
      `select id, podcast_id, episode_name, slug, date_published, duration, guid, audio_url, image_url, episode_itunes_id, description from podcast_episode where id in (${ids(merged)})`,
    ),
    // These only gain a GUID; restoring them means clearing it again.
    guidAssigned: plan.guids.map((a) => a.episodeId),
    urls: await sql(
      `select * from podcast_episode_url where episode_id in (${ids(merged)})`,
    ),
    reviews: await sql(
      `select * from podcast_episode_review where episode_id in (${ids(merged)})`,
    ),
    shares: await sql(
      `select * from social_share where episode_id in (${ids(merged)})`,
    ),
  };
  await mkdir('data/backups', { recursive: true });
  const backupPath = `data/backups/episode-identity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await Bun.write(backupPath, JSON.stringify(backup, null, 1));
  console.log(
    `Backed up ${backup.episodes.length} merged episodes (+${backup.guidAssigned.length} GUID-only), ${backup.podcasts.length} podcasts, ${backup.urls.length} URLs, ${backup.reviews.length} reviews, ${backup.shares.length} shares → ${backupPath}`,
  );

  // One DO block: any failure rolls everything back.
  await sql(`do $do$
declare
  plan jsonb := $plan$${JSON.stringify(plan)}$plan$::jsonb;
  m jsonb; u jsonb; a jsonb; d jsonb;
  keeper int; dup int; gone podcast%rowtype;
begin
  for m in select * from jsonb_array_elements(plan->'podcastMerges') loop
    keeper := (m->>'keeper')::int; dup := (m->>'dup')::int;
    update podcast_episode set podcast_id = keeper where podcast_id = dup;
    -- Unique IDs move only once the duplicate row is gone (a row may not drop all its IDs).
    select * into gone from podcast where id = dup;
    delete from podcast where id = dup;
    update podcast set
      spotify_id = coalesce(spotify_id, gone.spotify_id),
      castro_id = coalesce(castro_id, gone.castro_id),
      rss_feed = coalesce(rss_feed, gone.rss_feed),
      artist_name = coalesce(artist_name, gone.artist_name),
      image_url = coalesce(image_url, gone.image_url),
      genres = coalesce(genres, gone.genres)
    where id = keeper;
  end loop;

  for u in select * from jsonb_array_elements(plan->'podcastUpdates') loop
    update podcast set
      itunes_id = coalesce(itunes_id, u->>'itunes_id'),
      rss_feed = coalesce(rss_feed, u->>'rss_feed'),
      genres = coalesce(genres, nullif(array(select jsonb_array_elements_text(u->'genres')), '{}'))
    where id = (u->>'id')::int;
  end loop;

  for m in select * from jsonb_array_elements(plan->'episodeMerges') loop
    keeper := (m->>'keeper')::int;
    for d in select * from jsonb_array_elements(m->'dups') loop
      dup := d::text::int;
      update podcast_episode_url set episode_id = keeper where episode_id = dup;
      -- One review per user and episode: the most recent one wins.
      delete from podcast_episode_review r using podcast_episode_review k
        where r.episode_id = dup and k.episode_id = keeper and k.user_id = r.user_id
          and coalesce(k.updated_at, k.created_at) >= coalesce(r.updated_at, r.created_at);
      delete from podcast_episode_review k using podcast_episode_review r
        where k.episode_id = keeper and r.episode_id = dup and k.user_id = r.user_id;
      update podcast_episode_review set episode_id = keeper where episode_id = dup;
      delete from social_share s using social_share k
        where s.episode_id = dup and k.episode_id = keeper and k.twitter_screen_name = s.twitter_screen_name;
      update social_share set episode_id = keeper where episode_id = dup;
      update podcast_episode k set
        date_published = coalesce(k.date_published, x.date_published),
        duration = coalesce(k.duration, x.duration),
        audio_url = coalesce(k.audio_url, x.audio_url),
        image_url = coalesce(k.image_url, x.image_url),
        description = coalesce(k.description, x.description),
        episode_itunes_id = coalesce(k.episode_itunes_id, x.episode_itunes_id)
      from podcast_episode x where k.id = keeper and x.id = dup;
      -- Episode deletes cascade: nothing may still point at the row.
      if exists (select 1 from podcast_episode_url where episode_id = dup)
        or exists (select 1 from podcast_episode_review where episode_id = dup)
        or exists (select 1 from social_share where episode_id = dup) then
        raise exception 'episode % still has rows attached', dup;
      end if;
      delete from podcast_episode where id = dup;
    end loop;
  end loop;

  for a in select * from jsonb_array_elements(plan->'guids') loop
    update podcast_episode set guid = a->>'guid' where id = (a->>'episodeId')::int and guid is null;
  end loop;
end
$do$;`);

  const after = await counts();
  console.log('\n            before → after (expected change)');
  let ok = true;
  for (const [k, change] of Object.entries(plan.delta)) {
    const good = after[k] === before[k] + change;
    ok &&= good;
    console.log(
      `  ${k.padEnd(9)} ${before[k]} → ${after[k]} (${change >= 0 ? '+' : ''}${change}) ${good ? '✓' : '✗'}`,
    );
  }
  console.log(
    ok
      ? '\nApplied and verified.'
      : `\nCounts differ from the plan — inspect, and restore from ${backupPath} if needed.`,
  );

  // Cached pages still show the merged-away rows until their tags are revalidated.
  const { REVALIDATE_SECRET: secret, NEXT_PUBLIC_HOST: host } = process.env;
  if (!secret || !host)
    return console.log(
      'REVALIDATE_SECRET / NEXT_PUBLIC_HOST unset: caches expire on their own.',
    );
  const tags = [
    'search-episodes',
    'user-podcast-reviews',
    'podcast-ranking',
    ...plan.episodeMerges.flatMap((m) =>
      [m.keeper, ...m.dups].flatMap((id) => [
        `episode-details:${id}`,
        `episode-metadata:${id}`,
      ]),
    ),
    ...podcastIds.flatMap((id) => [
      `podcast-details:${id}`,
      `podcast-metadata:${id}`,
    ]),
  ];
  let revalidated = 0;
  for (const tag of tags) {
    const response = await fetch(
      `${host}/api/revalidate?secret=${encodeURIComponent(secret)}&tag=${encodeURIComponent(tag)}`,
    );
    if (response.ok) revalidated++;
  }
  console.log(
    `Revalidated ${revalidated}/${tags.length} cache tags on ${host}`,
  );
}

await (APPLY ? apply() : makePlan());
