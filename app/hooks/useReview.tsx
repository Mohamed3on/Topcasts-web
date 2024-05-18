'use client';
import { ReviewType } from '@/app/api/types';
import { useUser } from '@/app/auth/UserContext';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useReview = (episodeId: number, reviewType?: ReviewType) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();

  const toggleReview = useCallback(
    async (type: ReviewType) => {
      if (!user?.id)
        return router.push(`/login?next=${window.location.pathname}`);

      setIsLoading(true);

      const { error } =
        reviewType === type
          ? await supabase
              .from('podcast_episode_review')
              .delete()
              .eq('episode_id', episodeId)
              .eq('user_id', user.id)
          : await supabase
              .from('podcast_episode_review')
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
    [user?.id, router, reviewType, episodeId],
  );

  return { toggleReview, isLoading };
};
