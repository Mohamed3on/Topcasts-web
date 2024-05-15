'use client';
import { ReviewType } from '@/app/api/types';
import { useReview } from '@/app/hooks/useReview';
import { Button } from '@/components/ui/button';
import { Loader2Icon, ThumbsDownIcon, ThumbsUp } from 'lucide-react';
import React from 'react';

interface RatingButtonsProps {
  episode: {
    review_type: string;
    likes: number;
    dislikes: number;
    id: number;
  };
}

const RatingButtons: React.FC<RatingButtonsProps> = ({ episode }) => {
  const { toggleReview, isLoading } = useReview(
    episode.id,
    episode.review_type as ReviewType,
  );
  return (
    <div className="flex gap-1">
      <Button
        className={`flex gap-1 transition-colors hover:text-green-600 active:text-green-700
         ${episode.review_type === 'like' ? 'text-green-500' : ''}`}
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          toggleReview('like');
        }}
        variant="link"
      >
        {isLoading ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <ThumbsUp className="h-5 w-5" />
        )}
        <span className="sr-only">Like</span>
        <span className="text-xs font-medium">{episode.likes}</span>
      </Button>
      <Button
        onClick={async (e) => {
          e.preventDefault();
          toggleReview('dislike');
        }}
        className={`flex gap-1 transition-colors hover:text-red-600 active:text-red-700 ${
          episode.review_type === 'dislike' ? 'text-red-500 ' : ''
        }`}
        size="icon"
        variant="link"
      >
        {isLoading ? (
          <Loader2Icon className="h-5 w-5 animate-spin" />
        ) : (
          <ThumbsDownIcon className="h-5 w-5" />
        )}
        <span className="sr-only">Dislike</span>
        <span className="text-xs font-medium">{episode.dislikes}</span>
      </Button>
    </div>
  );
};

export default RatingButtons;
