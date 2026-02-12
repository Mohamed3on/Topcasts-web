'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { lookupEpisodeByUrl } from './actions';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 20; // ~30 seconds total

/**
 * Lightweight client component that polls for the episode to appear in the DB
 * after background processing, then redirects to the episode page.
 */
export function PollAndRedirect({ url }: { url: string }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      attempts.current++;

      try {
        const episode = await lookupEpisodeByUrl(url);
        if (episode?.id && episode?.slug) {
          clearInterval(interval);
          router.replace(`/episode/${episode.id}/${episode.slug}`);
        }
      } catch {
        // Ignore errors, keep polling
      }

      if (attempts.current >= MAX_ATTEMPTS) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [url, router]);

  return null;
}
