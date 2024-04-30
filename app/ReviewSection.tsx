import { ReviewButtons } from '@/app/ReviewButtons';
import { ReviewType } from '@/app/api/types';
import { Database } from '@/app/api/types/supabase';
import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const ReviewSection = async ({ episodeId }: { episodeId: number }) => {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookies() as CookieOptions,
    }
  );

  const { data } = await supabase
    .from('episode_reviews')
    .select('review_type')
    .eq('episode_id', episodeId)
    .single();

  const reviewType = data?.review_type as ReviewType;

  return <ReviewButtons reviewType={reviewType} episodeId={episodeId} />;
};
