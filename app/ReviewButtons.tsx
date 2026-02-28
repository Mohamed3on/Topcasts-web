'use client';
import { ReviewType } from '@/app/api/types';
import { Button } from '@/components/ui/button';
import { Loader2Icon, ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import { useRef } from 'react';
import { useReview } from './hooks/useReview';

const reviewOptions = [
  { type: 'like', Icon: ThumbsUp, color: 'text-green-500' },
  { type: 'dislike', Icon: ThumbsDownIcon, color: 'text-red-500' },
] as const;

export const ReviewButtons = ({
  episodeId,
  reviewType,
  likes,
  dislikes,
}: {
  episodeId: number;
  reviewType?: ReviewType;
  likes: number;
  dislikes: number;
}) => {
  const { toggleReview, isLoading } = useReview(episodeId, reviewType);
  const iconRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const handleClick = async (type: ReviewType) => {
    const el = iconRefs.current[type];
    if (el) {
      el.classList.remove('animate-pop');
      void el.offsetWidth;
      el.classList.add('animate-pop');
    }
    toggleReview(type);
  };

  return (
    <div className="flex gap-3">
      {reviewOptions.map(({ type, Icon, color }) => (
        <Button
          disabled={isLoading}
          key={type}
          aria-label={type}
          variant="secondary"
          className={`flex items-center gap-2 transition-colors hover:bg-slate-200 active:bg-slate-300 ${
            reviewType === type ? color : ''
          }`}
          onClick={() => handleClick(type)}
        >
          <span ref={(el) => { iconRefs.current[type] = el; }}>
            {!isLoading ? (
              <Icon size={22} />
            ) : (
              <Loader2Icon size={22} className="animate-spin" />
            )}
          </span>
          <span className="text-sm tabular-nums">{type === 'like' ? likes : dislikes}</span>
        </Button>
      ))}
    </div>
  );
};
