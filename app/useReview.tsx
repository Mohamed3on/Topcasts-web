'use client';
import { ReviewType } from '@/app/api/types';
import { useUser } from '@/app/auth/useUser';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useReview = (episodeId: number, reviewType?: ReviewType) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();
  const supabase = createClient();

  const toggleReview = useCallback(
    async (type: ReviewType) => {
      if (!user?.id)
        return router.replace(`/login?next=${window.location.pathname}`);

      setIsLoading(true);

      const { error, data } =
        reviewType === type
          ? await supabase
              .from('episode_reviews')
              .delete()
              .eq('episode_id', episodeId)
              .eq('user_id', user.id)
          : await supabase
              .from('episode_reviews')
              .upsert(
                {
                  episode_id: episodeId,
                  user_id: user.id,
                  review_type: type,
                  updated_at: new Date().toISOString(),
                },
                {
                  onConflict: 'user_id, episode_id',
                },
              )
              .select('review_type')
              .single();

      if (error) {
        toast('Error updating your rating, please try again later', {
          className: 'bg-red-500 text-white',
        });
      } else {
        router.refresh();
      }
      setIsLoading(false);
    },
    [user?.id, router, reviewType, supabase, episodeId],
  );

  return { toggleReview, isLoading };
};
