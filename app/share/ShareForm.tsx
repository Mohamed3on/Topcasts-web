'use client';

import { LoaderButton } from '@/app/LoaderButton';
import { determineType } from '@/app/api/episode/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

async function submitEpisode(
  supabase: ReturnType<typeof createClient>,
  url: string,
  rating: string,
  reviewText?: string,
) {
  const accessToken = (await supabase.auth.getSession()).data.session
    ?.access_token;

  if (!accessToken) return null;

  const response = await fetch('/api/episode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, rating, review_text: reviewText }),
  });

  return response.json();
}

export function ShareForm({
  url,
  rating: initialRating,
}: {
  url: string;
  rating?: 'like' | 'dislike';
}) {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(initialRating ?? 'like');
  const [reviewText, setReviewText] = useState('');
  const autoSubmitted = useRef(false);

  const isValidUrl = (() => {
    try {
      return !!determineType(url);
    } catch {
      return false;
    }
  })();

  const autoSubmit = initialRating !== undefined;

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const params = new URLSearchParams({ url, rating });
        router.push(`/login?redirect=${encodeURIComponent(`/share?${params}`)}`);
        return;
      }

      const data = await submitEpisode(supabase, url, rating, reviewText);

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to save episode');
      }

      toast.success('Episode saved!');
      router.push(`/episode/${data.id}/${data.slug}`);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        'Error saving episode. Is this a valid Apple Podcasts, Spotify, or Castro URL?',
      );
    }
  };

  useEffect(() => {
    if (autoSubmit && isValidUrl && !autoSubmitted.current) {
      autoSubmitted.current = true;
      handleSubmit();
    }
  }, []);

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

  if (autoSubmit) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">Saving episode...</p>
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
