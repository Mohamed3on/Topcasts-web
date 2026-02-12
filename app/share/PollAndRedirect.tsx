'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { lookupEpisodeByUrl } from './actions';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 20;

export function PollAndRedirect({ url }: { url: string }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled || attempts.current >= MAX_ATTEMPTS) return;
      attempts.current++;

      try {
        const episode = await lookupEpisodeByUrl(url);
        if (episode?.id) {
          const path = episode.slug
            ? `/episode/${episode.id}/${episode.slug}`
            : `/episode/${episode.id}`;
          router.replace(path);
          return;
        }
      } catch {
        // Ignore errors, keep polling
      }

      if (!cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [url, router]);

  return null;
}
