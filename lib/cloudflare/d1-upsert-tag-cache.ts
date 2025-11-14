import { error } from '@opennextjs/aws/adapters/logger';
import type { NextModeTagCache } from '@opennextjs/aws/types/overrides';
import { getCloudflareContext } from '@opennextjs/cloudflare/cloudflare-context';
import {
  debugCache,
  FALLBACK_BUILD_ID,
  isPurgeCacheEnabled,
  purgeCacheByTags,
} from '@opennextjs/cloudflare/overrides/internal';

const NAME = 'd1-next-mode-tag-cache';
const BINDING_NAME = 'NEXT_TAG_CACHE_D1' as const;

type D1Binding = NonNullable<
  ReturnType<typeof getCloudflareContext>['env'][typeof BINDING_NAME]
>;

type CacheConfig =
  | { isDisabled: true }
  | { isDisabled: false; db: D1Binding };

const buildPlaceholders = (values: string[]) =>
  values.map(() => '?').join(', ');

const UPSERT_STATEMENT = `
  INSERT INTO revalidations (tag, revalidatedAt)
  VALUES (?, ?)
  ON CONFLICT(tag) DO UPDATE SET revalidatedAt = excluded.revalidatedAt
`;

class D1UpsertTagCache implements NextModeTagCache {
  readonly mode = 'nextMode' as const;
  readonly name = NAME;

  async getLastRevalidated(tags: string[]): Promise<number> {
    const config = this.getConfig();
    if (config.isDisabled || tags.length === 0) {
      return 0;
    }
    const { db } = config;

    try {
      const result = await db
        .prepare(
          `SELECT MAX(revalidatedAt) AS time FROM revalidations WHERE tag IN (${buildPlaceholders(
            tags,
          )})`,
        )
        .bind(...tags.map((tag) => this.getCacheKey(tag)))
        .run();

      const timeMs = (result.results[0]?.time as number | null) ?? 0;
      debugCache('D1NextModeTagCache', `getLastRevalidated tags=${tags} -> ${timeMs}`);
      return timeMs;
    } catch (e) {
      error(e as Error);
      return 0;
    }
  }

  async hasBeenRevalidated(tags: string[], lastModified?: number): Promise<boolean> {
    const config = this.getConfig();
    if (config.isDisabled || tags.length === 0) {
      return false;
    }
    const { db } = config;

    try {
      const result = await db
        .prepare(
          `SELECT 1 FROM revalidations WHERE tag IN (${buildPlaceholders(
            tags,
          )}) AND revalidatedAt > ? LIMIT 1`,
        )
        .bind(...tags.map((tag) => this.getCacheKey(tag)), lastModified ?? Date.now())
        .raw();

      const revalidated = result.length > 0;
      debugCache(
        'D1NextModeTagCache',
        `hasBeenRevalidated tags=${tags} at=${lastModified} -> ${revalidated}`,
      );
      return revalidated;
    } catch (e) {
      error(e as Error);
      return false;
    }
  }

  async writeTags(tags: string[]): Promise<void> {
    const config = this.getConfig();
    if (config.isDisabled || tags.length === 0) {
      return Promise.resolve();
    }
    const { db } = config;

    const nowMs = Date.now();
    await db.batch(
      tags.map((tag) =>
        db.prepare(UPSERT_STATEMENT).bind(this.getCacheKey(tag), nowMs),
      ),
    );
    debugCache('D1NextModeTagCache', `writeTags tags=${tags} time=${nowMs}`);

    if (isPurgeCacheEnabled()) {
      await purgeCacheByTags(tags);
    }
  }

  private getConfig(): CacheConfig {
    const db = getCloudflareContext().env[BINDING_NAME];
    if (!db) {
      debugCache('D1NextModeTagCache', 'No D1 database found');
      return { isDisabled: true };
    }

    type OpenNextGlobal = typeof globalThis & {
      openNextConfig?: { dangerous?: { disableTagCache?: boolean } };
    };
    const isDisabled = Boolean(
      (globalThis as OpenNextGlobal).openNextConfig?.dangerous?.disableTagCache,
    );
    return isDisabled ? { isDisabled: true } : { isDisabled: false, db };
  }

  protected getCacheKey(key: string): string {
    return `${this.getBuildId()}/${key}`.replaceAll('//', '/');
  }

  protected getBuildId(): string {
    return process.env.NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
  }
}

const d1UpsertTagCache = new D1UpsertTagCache();

export default d1UpsertTagCache;
