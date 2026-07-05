import { AnimatedCount } from '@/app/components/AnimatedCount';
import {
  getCachedPodcastRanking,
  getCachedProfile,
  getCachedUserPodcastReviews,
} from '@/utils/supabase/server-cache';
import { createClient } from '@/utils/supabase/ssr';
import { BarChart, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

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

  // Where this podcast ranks among all the podcasts you've reviewed — same
  // ordering as your statistics page.
  const profile = await getCachedProfile(user.id);
  const username = profile?.username;
  const ranking = username ? await getCachedPodcastRanking(username) : null;
  const rank = ranking ? ranking.findIndex((p) => p.id === podcastId) + 1 : 0;

  return (
    <div className="flex animate-fade-in-up flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm md:justify-start">
      {username && ranking && rank > 0 && (
        <Link
          href={`/user/${username}/podcast/statistics`}
          title={`Your #${rank} podcast of the ${ranking.length} you've reviewed`}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary tabular-nums transition-colors hover:bg-primary/20"
        >
          <BarChart className="h-3.5 w-3.5" />
          <span>
            #<AnimatedCount value={rank} />
          </span>
          <span className="font-normal text-primary/60">of {ranking.length}</span>
        </Link>
      )}
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-green-500">
        <ThumbsUp className="h-3.5 w-3.5" />
        <AnimatedCount value={likes_count} />
      </span>
      <span className="inline-flex items-center gap-1 font-medium tabular-nums text-red-500">
        <ThumbsDown className="h-3.5 w-3.5" />
        <AnimatedCount value={dislikes_count} />
      </span>
      <span
        className="inline-flex items-center gap-1"
        title={`You've liked ${likePercentage}% of this podcast's episodes you've reviewed`}
      >
        <AnimatedCount
          value={likePercentage}
          suffix="%"
          className={`font-semibold tabular-nums transition-colors duration-300 ${
            likePercentage >= 50 ? 'text-green-600' : 'text-red-600'
          }`}
        />
        <span className="text-muted-foreground">liked</span>
      </span>
    </div>
  );
}
