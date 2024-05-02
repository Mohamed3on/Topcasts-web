import { ReviewButtons } from '@/app/ReviewButtons';
import { ReviewType } from '@/app/api/types';
import { createClient } from '@/utils/supabase/server';

export const ReviewSection = async ({ episodeId }: { episodeId: number }) => {
  let reviewType: ReviewType | undefined = undefined;
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  if (userData?.user) {
    const { data } = await supabase
      .from('episode_reviews')
      .select('review_type')
      .eq('episode_id', episodeId)
      .eq('user_id', userData.user.id)
      .single();

    reviewType = data?.review_type as ReviewType;
  }

  return <ReviewButtons reviewType={reviewType} episodeId={episodeId} />;
};
