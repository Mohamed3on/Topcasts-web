import { AnimatedCount } from '@/app/components/AnimatedCount';
import { getCachedUserPodcastReviews } from '@/utils/supabase/server-cache';
import { createClient } from '@/utils/supabase/ssr';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

// Compact "your history with this podcast" summary, shown under the podcast
// name on the episode page. Reuses the same cached/revalidated data source as
// YouAndPodcast, so it updates automatically when you like/dislike an episode.
export default async function YourPodcastSummary({
  podcastId,
}: {
  podcastId: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const data = await getCachedUserPodcastReviews(user.id, podcastId);
  const summary = data?.[0];
  if (!summary) return null;

  const { likes_count, dislikes_count } = summary;
  const total = likes_count + dislikes_count;
  if (total === 0) return null;

  const likePercentage = Math.round((likes_count / total) * 100);

  return (
    <div className="flex animate-fade-in-up flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-green-500">
        <ThumbsUp className="h-3.5 w-3.5" />
        <AnimatedCount value={likes_count} />
      </span>
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-red-500">
        <ThumbsDown className="h-3.5 w-3.5" />
        <AnimatedCount value={dislikes_count} />
      </span>
      <span className="text-muted-foreground">
        &middot; You&apos;ve liked{' '}
        <AnimatedCount
          value={likePercentage}
          suffix="%"
          className={`font-semibold transition-colors duration-300 ${
            likePercentage >= 50 ? 'text-green-600' : 'text-red-600'
          }`}
        />{' '}
        of episodes you&apos;ve reviewed
      </span>
    </div>
  );
}
