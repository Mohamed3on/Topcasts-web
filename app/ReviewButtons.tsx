'use client';
import { ReviewType } from '@/app/api/types';
import { useUser } from '@/app/auth/useUser';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { Loader2Icon, ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

const reviewOptions = [
  { type: 'like', Icon: ThumbsUp, color: 'text-green-500' },
  { type: 'dislike', Icon: ThumbsDownIcon, color: 'text-red-500' },
] as const;

const useReview = (episodeId: number, reviewType?: ReviewType) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useUser();
  const supabase = createClient();

  const toggleReview = useCallback(
    async (type: ReviewType) => {
      if (!user?.id) return router.replace(`/login?next=${window.location.pathname}`);

      setIsLoading(true);

      const { error } =
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
                }
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
    [user?.id, router, reviewType, supabase, episodeId]
  );

  return { toggleReview, isLoading };
};

export const ReviewButtons = ({
  episodeId,
  reviewType,
}: {
  episodeId: number;
  reviewType?: ReviewType;
}) => {
  const { toggleReview, isLoading } = useReview(episodeId, reviewType);

  return (
    <div className='flex gap-4'>
      {reviewOptions.map(({ type, Icon, color }) => (
        <Button
          disabled={isLoading}
          key={type}
          variant='secondary'
          className={`flex items-center gap-2 hover:bg-slate-300 active:bg-slate-200 transition-colors ${
            reviewType === type ? color : ''
          }`}
          onClick={() => toggleReview(type)}
        >
          {!isLoading ? <Icon size={24} /> : <Loader2Icon size={24} className='animate-spin' />}
          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </Button>
      ))}
    </div>
  );
};
