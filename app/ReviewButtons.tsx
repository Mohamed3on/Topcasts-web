'use client';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

const reviewOptions = [
  { type: 'like', Icon: ThumbsUp, color: 'text-green-500' },
  { type: 'dislike', Icon: ThumbsDownIcon, color: 'text-red-500' },
] as const;

export const ReviewButtons = ({
  episodeId,
  reviewType,
}: {
  episodeId: number;
  reviewType?: 'like' | 'dislike' | 'meh';
}) => {
  const router = useRouter();
  const supabase = createClient();

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const toggleReview = async (type: 'like' | 'dislike' | 'meh') => {
    const user = await getUser();
    if (!user?.id) return;

    const { data, error } =
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
            .select('review_type');

    console.log(data, error);
    router.refresh();
  };

  return (
    <div className='flex gap-4'>
      {reviewOptions.map(({ type, Icon, color }) => (
        <Button
          key={type}
          variant='secondary'
          className={`flex items-center gap-2 hover:bg-slate-300 active:bg-slate-200 ${
            reviewType === type ? color : ''
          }`}
          onClick={() => toggleReview(type)}
        >
          <Icon size={24} />
          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </Button>
      ))}
    </div>
  );
};
