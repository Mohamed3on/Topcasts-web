import { ReviewButtons } from '@/app/ReviewButtons';
import { ReviewTextEditor } from '@/app/ReviewTextEditor';
import { ReviewType } from '@/app/api/types';
import { createClient } from '@/utils/supabase/ssr';

export const ReviewSection = async ({
  episodeId,
  likes,
  dislikes,
}: {
  episodeId: number;
  likes: number;
  dislikes: number;
}) => {
  let reviewType: ReviewType | undefined = undefined;
  let reviewText: string | undefined = undefined;
  let avatarUrl: string | undefined = undefined;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  if (userData?.user) {
    avatarUrl = userData.user.user_metadata?.avatar_url;

    const { data } = await supabase
      .from('podcast_episode_review')
      .select('review_type, text')
      .eq('episode_id', episodeId)
      .eq('user_id', userData.user.id)
      .single();

    reviewType = data?.review_type as ReviewType;
    reviewText = data?.text as string;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ReviewButtons
        reviewType={reviewType}
        episodeId={episodeId}
        likes={likes}
        dislikes={dislikes}
      />

      {reviewType && (
        <ReviewTextEditor
          episodeId={episodeId}
          reviewText={reviewText}
          avatarUrl={avatarUrl}
        />
      )}
    </div>
  );
};
