# Caching Implementation Guide

This document outlines the caching strategy implemented using Next.js `unstable_cache`.

## Solution: Non-SSR Supabase Client for Caching

We use a **non-SSR Supabase client** (`@supabase/supabase-js`) for read-only cached queries, which doesn't use cookies. For auth operations, we still use the SSR client.

## Cached Operations

### 1. Web Scraping Operations (24 hour cache)
**File:** `app/api/episode/utils-cached.ts`

- `getCachedAppleEpisode()` - Apple Podcasts episode scraping
- `getCachedCastroEpisode()` - Castro episode scraping
- `getCachedSpotifyEpisode()` - Spotify API calls
- `getCachedEpisodeData()` - Generic scraper for all types

**Usage:**
```typescript
import { getCachedAppleEpisode } from '@/app/api/episode/utils-cached';

const episodeData = await getCachedAppleEpisode(url);
```

**Revalidation:** 24 hours (86400 seconds)
**Tags:** `['apple-episode']`, `['castro-episode']`, `['spotify-episode']`, `['episode-scrape']`

### 2. Database Queries (1 hour cache)
**File:** `utils/supabase/server-cache.ts`

All read-only database queries using the non-SSR Supabase client:

- `getCachedEpisodeDetails(episodeId)` - Episode with ratings and URLs
- `getCachedPodcastDetails(podcastId)` - Full podcast details
- `getCachedPodcastMetadata(podcastId)` - Podcast name, image, artist
- `getCachedEpisodeMetadata(episodeId)` - Episode name and image

**Usage:**
```typescript
import { getCachedEpisodeDetails } from '@/utils/supabase/server-cache';

const episode = await getCachedEpisodeDetails(episodeId);
```

**Revalidation:** 1 hour (3600 seconds)
**Tags:** `['episode-details']`, `['podcast-details']`, `['podcast-metadata']`, `['episode-metadata']`

### 3. Search Results (5 minute cache)
**File:** `utils/supabase/server-cache.ts`

- `getCachedSearchResults()` - Search episodes with pagination

**Usage:**
```typescript
import { getCachedSearchResults } from '@/utils/supabase/server-cache';

const results = await getCachedSearchResults(
  searchQuery,
  userId,
  episodeName,
  podcastName,
  pageIndex,
  pageSize
);
```

**Revalidation:** 5 minutes (300 seconds)
**Tags:** `['search-episodes']`

## Implementation Details

### Two Supabase Clients

1. **SSR Client** (`utils/supabase/ssr.ts`) - Uses cookies, for auth operations
2. **Server Client** (`utils/supabase/server-cache.ts`) - No cookies, for cached read-only queries

### Usage Pattern

```typescript
// For cached read-only data
const episode = await getCachedEpisodeDetails(id);

// For user-specific operations (auth required)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

## Cache Invalidation

To manually invalidate caches, use Next.js cache tags:

```typescript
import { revalidateTag } from 'next/cache';

// Invalidate specific caches
revalidateTag('episode-details');
revalidateTag('apple-episode');
revalidateTag('search-episodes');
```

Or invalidate by path:

```typescript
import { revalidatePath } from 'next/cache';

revalidatePath('/episode/[id]');
revalidatePath('/podcast/[id]');
revalidatePath('/search');
```

## Performance Impact

### Before Caching:
- Episode scraping: ~500-2000ms per request
- Database queries: ~100-500ms per request
- Search queries: ~200-800ms per request

### After Caching:
- Cached hits: ~5-20ms
- First request still takes full time to populate cache
- Subsequent requests are 10-100x faster

## Best Practices

1. **Don't cache user-specific data** - The current implementation caches search results with userId, which is fine for public data but be careful with personalized content

2. **Adjust revalidation times based on data freshness needs:**
   - Static/rarely changing: 24 hours or more
   - Semi-dynamic: 1 hour
   - Frequently changing: 5 minutes

3. **Use cache tags for granular invalidation** - When data changes (e.g., episode updated), invalidate only relevant caches

4. **Monitor cache hit rates** - Check Next.js build output for cache statistics

## Future Improvements

1. Migrate to `use cache` directive when it reaches stability
2. Implement cache warming for popular episodes/podcasts
3. Add cache metrics/monitoring
4. Consider Redis for distributed caching in production
