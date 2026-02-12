'use client';

import { LoaderButton } from '@/app/LoaderButton';
import { determineType } from '@/app/api/episode/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { shareEpisode } from './actions';

export function ShareForm({ url }: { url: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState<'like' | 'dislike'>('like');
  const [reviewText, setReviewText] = useState('');

  const isValidUrl = (() => {
    try {
      return !!determineType(url);
    } catch {
      return false;
    }
  })();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data = await shareEpisode(url, rating, reviewText);

      if ('error' in data) {
        if (data.error === 'Not authenticated') {
          const params = new URLSearchParams({ url, rating });
          router.push(
            `/login?redirect=${encodeURIComponent(`/share?${params}`)}`,
          );
          return;
        }
        throw new Error(data.error);
      }

      toast.success('Episode saved!');
      const path = data.slug
        ? `/episode/${data.id}/${data.slug}`
        : `/episode/${data.id}`;
      router.push(path);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        'Error saving episode. Is this a valid Apple Podcasts, Spotify, or Castro URL?',
      );
    }
  };

  if (!isValidUrl) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-bold">Invalid URL</h1>
        <p className="text-muted-foreground">
          Only Apple Podcasts, Spotify, and Castro episode URLs are supported.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="mb-6 text-center text-xl font-bold">Save Episode</h1>
      <p className="mb-6 truncate text-center text-sm text-muted-foreground">
        {url}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col items-center gap-6"
      >
        <RadioGroup
          value={rating}
          onValueChange={(v) => setRating(v as 'like' | 'dislike')}
          className="flex items-center justify-center gap-4"
        >
          <div className="flex items-center space-x-3 space-y-0">
            <RadioGroupItem
              className="flex items-center gap-1 text-slate-500 data-[state=checked]:border-green-500 data-[state=checked]:text-green-500"
              value="like"
            >
              <ThumbsUp />
              <span>Like</span>
            </RadioGroupItem>
          </div>
          <div className="flex items-center space-x-3 space-y-0">
            <RadioGroupItem
              className="flex items-center gap-1 text-slate-500 data-[state=checked]:border-red-500 data-[state=checked]:text-red-500"
              value="dislike"
            >
              <ThumbsDown />
              <span>Dislike</span>
            </RadioGroupItem>
          </div>
        </RadioGroup>

        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write a review (optional)"
          className="w-full"
        />

        <LoaderButton isLoading={isLoading}>Save Episode</LoaderButton>
      </form>
    </div>
  );
}
