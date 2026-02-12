import { redirect } from 'next/navigation';
import { ShareForm } from './ShareForm';
import { PollAndRedirect } from './PollAndRedirect';
import { createClient } from '@/utils/supabase/ssr';
import { determineType } from '@/app/api/episode/utils';
import {
  lookupEpisodeByUrl,
  processEpisodeInBackground,
  saveReviewInBackground,
} from './actions';

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
  // For existing episodes: instant redirect to episode page.
  // For new episodes: instant "Saved!" response, processing in background.
  if (validRating) {
    const isValid = (() => {
      try {
        return !!determineType(url);
      } catch {
        return false;
      }
    })();

    if (isValid) {
      const supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const params = new URLSearchParams({ url, rating: validRating });
        redirect(`/login?redirect=${encodeURIComponent(`/share?${params}`)}`);
      }

      // Single joined DB query — hits for existing episodes, misses for new ones
      const episode = await lookupEpisodeByUrl(url).catch(() => null);

      if (episode?.id && episode?.slug) {
        // Existing episode: save review in background, redirect instantly
        saveReviewInBackground(episode.id, session.user.id, validRating);
        redirect(`/episode/${episode.id}/${episode.slug}`);
      }

      // New episode: defer ALL work (scraping + DB writes + review) to background.
      // The user sees "Saved!" immediately — no waiting for external scraping.
      processEpisodeInBackground(url, validRating, session.user.id);

      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
          <div className="text-center">
            <h1 className="mb-2 text-xl font-bold">Episode saved!</h1>
            <p className="text-muted-foreground">
              Your {validRating} has been recorded. Redirecting...
            </p>
          </div>
          <PollAndRedirect url={url} />
        </main>
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <ShareForm url={url} rating={validRating} />
    </main>
  );
}
