'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { lookupEpisodeByUrl } from './actions';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 20;

export function PollAndRedirect({ url }: { url: string }) {
  const router = useRouter();
  const attempts = useRef(0);
  const [status, setStatus] = useState<'polling' | 'redirecting' | 'error'>(
    'polling',
  );

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (attempts.current >= MAX_ATTEMPTS) {
        setStatus('error');
        return;
      }
      attempts.current++;

      try {
        const episode = await lookupEpisodeByUrl(url);
        if (episode?.id) {
          setStatus('redirecting');
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

  if (status === 'error') {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Episode is taking longer than expected.{' '}
        <a href={url} className="underline">
          Open original link
        </a>
      </p>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      {status === 'redirecting' ? 'Redirecting...' : 'Loading episode...'}
    </div>
  );
}
