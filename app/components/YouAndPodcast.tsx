import { createClient } from '@/utils/supabase/ssr';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface YouAndPodcastProps {
  userId: string;
  podcastId: number;
  podcastName: string;
}

export default async function YouAndPodcast({
  userId,
  podcastId,
  podcastName,
}: YouAndPodcastProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_user_podcast_reviews', {
    user_id_param: userId,
    podcast_id_param: podcastId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const { likes_count, dislikes_count } = data[0];
  const totalReviews = likes_count + dislikes_count;
  const likePercentage =
    totalReviews > 0 ? Math.round((likes_count / totalReviews) * 100) : 0;

  return (
    <Card className="w-full md:w-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          You and {podcastName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="mb-2 flex w-full justify-around">
            <div className="flex items-center text-green-500">
              <ThumbsUp className="mr-1 h-4 w-4" />
              <span className="text-sm">{likes_count}</span>
            </div>
            <div className="flex items-center text-red-500">
              <ThumbsDown className="mr-1 h-4 w-4" />
              <span className="text-sm">{dislikes_count}</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            You&apos;ve liked {likePercentage}% of the episodes you&apos;ve
            reviewed!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
