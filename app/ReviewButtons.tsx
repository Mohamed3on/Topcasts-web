'use client';
import { ReviewType } from '@/app/api/types';
import { Button } from '@/components/ui/button';
import { Loader2Icon, ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import { useReview } from './useReview';

const reviewOptions = [
  { type: 'like', Icon: ThumbsUp, color: 'text-green-500' },
  { type: 'dislike', Icon: ThumbsDownIcon, color: 'text-red-500' },
] as const;

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
