// Episode identity across Apple, Spotify and Castro. The platforms share no
// episode ID, but all of them ingest the show's RSS feed, so the feed GUID is
// the cross-platform key. Without one, cleaned titles settle the clear cases
// and Jev (TypeSafe) judges the ambiguous rest — publishers retitle episodes
// after release, so the same recording often carries different titles.

const DAY_MS = 86_400_000;
const MAX_DATE_GAP_DAYS = 3;
const DESCRIPTION_CHARS = 6000;
// Tuned on jev-1.13.0; pinned so a model update can't silently move it.
export const JEV_MODEL = 'jev-1.13.0';
export const JEV_THRESHOLD = 0.8;

export type EpisodeFacts = {
  title: string;
  date?: string | null;
  duration?: number | null;
  guid?: string | null;
};

export type CandidateEpisode = EpisodeFacts & {
  id: number;
  urls?: { type: string; url: string }[];
};

export type FeedItem = EpisodeFacts & { guid: string; block: string };

// ── Titles ────────────────────────────────────────────────────────

/** Title with platform decoration removed — equal keys mean equal titles. */
export function titleKey(title: string): string {
  return title
    .replace(/\s+-\s+\[[^\]]*\]\s*$/, '') // Spotify's " - [Show, EP.12]"
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Latin accents
    .normalize('NFC') // recompose other scripts' marks (Japanese kana)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const STOP_WORDS = new Set(
  'the a an and or of to in on for with at by from is are be how why what who your you my i we our it its this that'.split(
    ' ',
  ),
);

function titleTokens(title: string): Set<string> {
  return new Set(
    titleKey(title)
      .split(' ')
      .filter((w) => w && !STOP_WORDS.has(w)),
  );
}

/** Share of the shorter title's words found in the other. */
function containment(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (Math.min(a.size, b.size) || 1);
}

// ── Dates and durations ───────────────────────────────────────────

export function dayGap(a?: string | null, b?: string | null): number | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  return Number.isNaN(ta) || Number.isNaN(tb)
    ? null
    : Math.abs(ta - tb) / DAY_MS;
}

function durationGap(a?: number | null, b?: number | null): number | null {
  return a && b ? Math.abs(a - b) : null;
}

const datesAgree = (a: EpisodeFacts, b: EpisodeFacts) =>
  (dayGap(a.date, b.date) ?? 0) <= MAX_DATE_GAP_DAYS;

// Castro rounds to the minute and ad insertion shifts lengths a little.
const durationsAgree = (a: EpisodeFacts, b: EpisodeFacts) =>
  (durationGap(a.duration, b.duration) ?? 0) <=
  Math.max(150_000, 0.05 * Math.max(a.duration ?? 0, b.duration ?? 0));

const guidsConflict = (a: EpisodeFacts, b: EpisodeFacts) =>
  !!a.guid && !!b.guid && a.guid !== b.guid;

// ── Code decisions ────────────────────────────────────────────────

/** The feed item for an episode: a unique title match with agreeing dates. */
export function findFeedGuid(
  items: FeedItem[],
  episode: EpisodeFacts,
): string | undefined {
  const key = titleKey(episode.title);
  const guids = new Set(
    items
      .filter(
        (item) => titleKey(item.title) === key && datesAgree(item, episode),
      )
      .map((item) => item.guid),
  );
  const [guid] = guids;
  // Some feeds reuse one GUID across different episodes; it identifies nothing.
  const reused = items.some(
    (i) => i.guid === guid && titleKey(i.title) !== key,
  );
  return guids.size === 1 && !reused ? guid : undefined;
}

/** A match code can vouch for: the same GUID, or the same title with nothing contradicting it. */
export function findCodeMatch(
  episode: EpisodeFacts,
  candidates: CandidateEpisode[],
): CandidateEpisode | undefined {
  if (episode.guid) {
    const byGuid = candidates.find((c) => c.guid === episode.guid);
    if (byGuid) return byGuid;
  }
  const key = titleKey(episode.title);
  return candidates
    .filter(
      (c) =>
        key &&
        titleKey(c.title) === key &&
        datesAgree(c, episode) &&
        durationsAgree(c, episode) &&
        !guidsConflict(c, episode),
    )
    .sort(byCloseness(episode))[0];
}

function platformEpisodeId(type: string, url: string): string | undefined {
  if (type === 'spotify') return url.match(/\/episode\/([A-Za-z0-9]+)/)?.[1];
  if (type === 'apple') return url.match(/[?&]i=(\d+)/)?.[1];
  return undefined; // Castro lists some feed items twice under different IDs
}

/**
 * Candidates worth asking Jev about. Clear non-matches stay out: a different
 * GUID, publish dates more than 3 days apart, or a URL from the same platform
 * pointing at another episode. The rest need some title overlap (ranked by
 * rare shared words, so a host's name in every title counts for little) or a
 * near-identical length, which catches episodes retitled beyond recognition.
 */
export function shortlist<
  T extends EpisodeFacts & { urls?: CandidateEpisode['urls'] },
>(
  episode: EpisodeFacts,
  candidates: T[],
  source?: { type: string; url: string },
): T[] {
  const sourceId = source && platformEpisodeId(source.type, source.url);
  const pool = candidates.filter(
    (c) =>
      !guidsConflict(c, episode) &&
      datesAgree(c, episode) &&
      !c.urls?.some(
        (u) =>
          u.type === source?.type &&
          sourceId &&
          platformEpisodeId(u.type, u.url) !== sourceId,
      ),
  );

  const tokens = titleTokens(episode.title);
  const docFreq = new Map<string, number>();
  const pooled = pool.map((c) => {
    const t = titleTokens(c.title);
    for (const w of t) docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
    return { c, t };
  });
  const idf = (w: string) =>
    Math.log((pool.length + 1) / ((docFreq.get(w) ?? 0) + 1));
  const weightedOverlap = (t: Set<string>) => {
    let shared = 0;
    let total = 0;
    for (const w of tokens) {
      total += idf(w);
      if (t.has(w)) shared += idf(w);
    }
    return total ? shared / total : 0;
  };

  const byTitle = pooled
    .filter(({ t }) => containment(tokens, t) >= 0.3)
    .map(({ c, t }) => ({ c, score: weightedOverlap(t) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ c }) => c);
  const byLength = pool
    .filter(
      (c) => (durationGap(c.duration, episode.duration) ?? Infinity) <= 10_000,
    )
    .sort(
      (a, b) =>
        durationGap(a.duration, episode.duration)! -
        durationGap(b.duration, episode.duration)!,
    )
    .slice(0, 3);

  return [...new Set([...byTitle, ...byLength])];
}

// Among equally good matches, prefer the one closest in date, then length.
function byCloseness(episode: EpisodeFacts) {
  return (
    a: EpisodeFacts & { id?: number },
    b: EpisodeFacts & { id?: number },
  ) =>
    (dayGap(a.date, episode.date) ?? Infinity) -
      (dayGap(b.date, episode.date) ?? Infinity) ||
    (durationGap(a.duration, episode.duration) ?? Infinity) -
      (durationGap(b.duration, episode.duration) ?? Infinity) ||
    (a.id ?? 0) - (b.id ?? 0);
}

// ── Jev ───────────────────────────────────────────────────────────

export type JevQuestion = {
  type: 'noul';
  instructions: Record<string, unknown>;
  criteria: { true: string; false: string };
};

/** Probability per question ID, or null when Jev couldn't answer. */
export type AskJev = (
  state: Record<string, unknown>,
  questions: Record<string, JevQuestion>,
) => Promise<Record<string, number> | null>;

const SAME_EPISODE_CRITERIA = {
  true: 'The same recording. The titles may differ only by an added episode number, a show-name or [Show, EP.N] suffix, or wording edits made when the episode was retitled, and the descriptions may be different excerpts of the same notes.',
  false:
    "Different recordings: another part of a series (Part 1 vs Part 2), a different numbered episode (even about the same book or guest), a re-release marked Update/Remastered/Encore/Archive, a shortened 'Essentials' cut, a free preview of a paid episode, or a different guest or topic.",
};

function bucketDays(gap: number | null): string {
  if (gap === null) return 'unknown';
  if (gap < 1) return 'same day';
  if (gap <= 3) return '1 to 3 days apart';
  return gap <= 30 ? '4 to 30 days apart' : 'more than a month apart';
}

function bucketDuration(gap: number | null): string {
  if (gap === null) return 'unknown';
  if (gap <= 60_000) return 'within 1 minute';
  if (gap <= 180_000) return '1 to 3 minutes apart';
  return gap <= 600_000
    ? '3 to 10 minutes apart'
    : 'more than 10 minutes apart';
}

const DECODE: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Plain text from HTML or feed markup (where HTML is often entity-encoded). */
export function plainText(html?: string | null): string {
  return (html ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) =>
      code[0] === '#'
        ? String.fromCodePoint(
            code[1].toLowerCase() === 'x'
              ? parseInt(code.slice(2), 16)
              : parseInt(code.slice(1), 10),
          )
        : (DECODE[code.toLowerCase()] ?? entity),
    )
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Described = EpisodeFacts & { description?: string | null };

/** "Is `candidate` the same recording as `episode`?", both carried in full. */
export function sameEpisodeQuestion(
  episode: Described,
  candidate: Described,
): JevQuestion {
  const describe = (e: Described) => ({
    title: e.title,
    description: plainText(e.description).slice(0, DESCRIPTION_CHARS),
  });
  return {
    type: 'noul',
    instructions: {
      question:
        'Are new_episode and candidate the same podcast episode, i.e. the same recording listed twice (for example by two different podcast apps)?',
      new_episode: describe(episode),
      candidate: describe(candidate),
      publish_dates: bucketDays(dayGap(episode.date, candidate.date)),
      durations: bucketDuration(
        durationGap(episode.duration, candidate.duration),
      ),
    },
    criteria: SAME_EPISODE_CRITERIA,
  };
}

// Jev reads the two roles slightly differently ("Part Two: X" as the new
// episode looked like "X", but not the other way round), so each candidate is
// asked both ways and must clear the threshold in both.
const BOTH_WAYS = (i: number) => [`c${i}`, `r${i}`] as const;

// A request may carry 64k tokens; leave headroom. Non-Latin scripts can take a
// token per character, so count those conservatively.
const REQUEST_TOKEN_BUDGET = 48_000;
const estimateTokens = (text: string) =>
  [...text].reduce((t, ch) => t + (ch.charCodeAt(0) < 128 ? 0.25 : 1), 0);

/** Both-way questions for as many candidates (best first) as one request holds. */
export function sameEpisodeQuestions(
  episode: Described,
  candidates: Described[],
): Record<string, JevQuestion> {
  const questions: Record<string, JevQuestion> = {};
  let tokens = 0;
  for (const [i, candidate] of candidates.entries()) {
    const pair = {
      [BOTH_WAYS(i)[0]]: sameEpisodeQuestion(episode, candidate),
      [BOTH_WAYS(i)[1]]: sameEpisodeQuestion(candidate, episode),
    };
    tokens += estimateTokens(JSON.stringify(pair));
    if (i > 0 && tokens > REQUEST_TOKEN_BUDGET) break;
    Object.assign(questions, pair);
  }
  return questions;
}

/** The candidate Jev is confident about; ties among confident ones go to the closest. */
export async function matchWithJev<T extends Described & { id?: number }>(
  episode: Described,
  candidates: T[],
  ask: AskJev,
  context: Record<string, unknown> = {},
): Promise<T | undefined> {
  if (!candidates.length) return undefined;
  const answers = await ask(
    { ...context, task: 'Podcast episode deduplication' },
    sameEpisodeQuestions(episode, candidates),
  );
  if (!answers) return undefined;
  return candidates
    .filter((_, i) =>
      BOTH_WAYS(i).every((id) => (answers[id] ?? 0) >= JEV_THRESHOLD),
    )
    .sort(byCloseness(episode))[0];
}

/** POST /v1/systemone over plain fetch — no SDK, so it runs on Workers as-is. */
export const askJev: AskJev = async (state, questions) => {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: JEV_MODEL, state, questions }),
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) {
        const { answers } = (await response.json()) as {
          answers: Record<string, { noul: number }>;
        };
        return Object.fromEntries(
          Object.entries(answers).map(([id, a]) => [id, a.noul]),
        );
      }
      console.warn(`[askJev] HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) return null;
    } catch (error) {
      console.warn('[askJev] Request failed', error);
    }
  }
  return null;
};

// ── RSS ───────────────────────────────────────────────────────────

function feedTag(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'),
  );
  return match ? plainText(match[1]) : '';
}

function feedDuration(raw: string): number | null {
  if (!raw) return null;
  const seconds = raw
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

/** Items of an RSS feed — a regex scan, cheap enough for multi-MB feeds on Workers. */
export function parseFeedItems(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].flatMap(
    ([block]) => {
      const guid = feedTag(block, 'guid');
      const pubDate = Date.parse(feedTag(block, 'pubDate'));
      return guid
        ? [
            {
              guid,
              title: feedTag(block, 'title'),
              date: Number.isNaN(pubDate)
                ? null
                : new Date(pubDate).toISOString().slice(0, 10),
              duration: feedDuration(feedTag(block, 'itunes:duration')),
              block,
            },
          ]
        : [];
    },
  );
}

/** Show notes of a feed item, for Jev; parsed only for shortlisted items. */
export function feedItemDescription(item: FeedItem): string {
  return (
    feedTag(item.block, 'content:encoded') ||
    feedTag(item.block, 'description') ||
    feedTag(item.block, 'itunes:summary')
  );
}

export async function fetchFeedItems(feedUrl: string): Promise<FeedItem[]> {
  try {
    const response = await fetch(feedUrl, {
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Topcasts)' },
    });
    if (!response.ok) {
      console.warn(`[fetchFeedItems] HTTP ${response.status} for ${feedUrl}`);
      return [];
    }
    return parseFeedItems(await response.text());
  } catch (error) {
    console.warn(`[fetchFeedItems] Failed for ${feedUrl}`, error);
    return [];
  }
}
