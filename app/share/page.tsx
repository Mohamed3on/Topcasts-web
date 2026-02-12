import { redirect } from 'next/navigation';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { ShareForm } from './ShareForm';
import { PollAndRedirect } from './PollAndRedirect';
import { createClient } from '@/utils/supabase/ssr';
import { determineType } from '@/app/api/episode/utils';
import { lookupEpisodeByUrl } from './actions';
import {
  processEpisodeInBackground,
  saveReviewInBackground,
} from './background';

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; rating?: string }>;
}) {
  const { url, rating } = await searchParams;

  if (!url) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold">Missing URL</h1>
          <p className="text-muted-foreground">
            Please provide an episode URL via the <code>?url=</code> parameter.
          </p>
        </div>
      </main>
    );
  }

  const validRating =
    rating === 'like' || rating === 'dislike' ? rating : undefined;

  // Auto-submit path (iOS Shortcut): handle everything server-side.
  // Returns a lightweight confirmation page — no redirect, no client JS.
  if (validRating) {
    const isValid = (() => {
      try {
        return !!determineType(url);
      } catch {
        return false;
      }
    })();

    if (isValid) {
      // Parallelize auth check and episode lookup
      const supabase = await createClient();
      const [{ data: { session } }, episode] = await Promise.all([
        supabase.auth.getSession(),
        lookupEpisodeByUrl(url).catch(() => null),
      ]);

      if (!session?.user) {
        const params = new URLSearchParams({ url, rating: validRating });
        redirect(`/login?redirect=${encodeURIComponent(`/share?${params}`)}`);
      }

      let episodePath: string | null = null;

      if (episode?.id) {
        saveReviewInBackground(episode.id, session.user.id, validRating);
        episodePath = episode.slug
          ? `/episode/${episode.id}/${episode.slug}`
          : `/episode/${episode.id}`;
      } else {
        processEpisodeInBackground(url, validRating, session.user.id);
      }

      const isLike = validRating === 'like';
      const Icon = isLike ? ThumbsUp : ThumbsDown;
      const iconColor = isLike ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';

      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">
              {isLike ? 'Liked' : 'Disliked'}!
            </h1>
            {episodePath ? (
              <a
                href={episodePath}
                className="text-sm text-muted-foreground underline"
              >
                View episode
              </a>
            ) : (
              <PollAndRedirect url={url} />
            )}
          </div>
        </main>
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <ShareForm url={url} />
    </main>
  );
}
