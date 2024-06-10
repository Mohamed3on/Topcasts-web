import { ReviewButtons } from '@/app/ReviewButtons';
import { ReviewType } from '@/app/api/types';
import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';

export const ReviewSection = async ({ episodeId }: { episodeId: number }) => {
  let reviewType: ReviewType | undefined = undefined;
  let reviewText: string | undefined = undefined;
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  if (userData?.user) {
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
      <ReviewButtons reviewType={reviewType} episodeId={episodeId} />

      {reviewText && (
        <div className="flex flex-col items-center gap-2 rounded border p-4">
          <Image
            width={32}
            height={32}
            className="rounded-full"
            src={userData?.user?.user_metadata?.avatar_url}
            alt="User Image"
          />
          <p className=" font-semibold">Your Review</p>
          <p className="italic">{reviewText}</p>
        </div>
      )}
    </div>
  );
};
