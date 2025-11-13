'use client';
import { ReviewType } from '@/app/api/types';
import { useUser } from '@/app/auth/UserContext';
import { toggleReview as toggleReviewAction } from '@/app/episodes/actions';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useReview = (episodeId: number, reviewType?: ReviewType) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();

  const toggleReview = useCallback(
    async (type: ReviewType) => {
      if (!user?.id) {
        router.push(`/login?next=${window.location.pathname}`);
        return false;
      }

      setIsLoading(true);

      const result = await toggleReviewAction(episodeId, type, reviewType);

      const success = !result.error;

      if (!success) {
        toast('Error updating your rating, please try again later', {
          className: 'bg-red-500 text-white',
        });
      }

      setIsLoading(false);
      return success;
    },
    [user?.id, router, reviewType, episodeId],
  );

  return { toggleReview, isLoading };
};
