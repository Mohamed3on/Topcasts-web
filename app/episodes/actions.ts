'use server';

import { ReviewType } from '@/app/api/types';
import { createClient } from '@/utils/supabase/ssr';
import { revalidateTag } from 'next/cache';
import { revalidateReviewTags } from '@/app/api/episode/process';

export async function saveReviewText(episodeId: number, text: string | null) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const { error } = await (supabase as any)
    .from('podcast_episode_review')
    .update({ text: text || null, updated_at: new Date().toISOString() })
    .eq('episode_id', episodeId)
    .eq('user_id', userData.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidateTag(`episode-details:${episodeId}`, 'max');
  return { success: true };
}

export async function toggleReview(
  episodeId: number,
  type: ReviewType,
  currentReviewType?: ReviewType,
) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = userData.user.id;

  const { error } =
    currentReviewType === type
      ? await (supabase as any)
          .from('podcast_episode_review')
          .delete()
          .eq('episode_id', episodeId)
          .eq('user_id', userId)
      : await (supabase as any)
          .from('podcast_episode_review')
          .upsert(
            {
              episode_id: episodeId,
              user_id: userId,
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
    return { error: error.message };
  }

  revalidateReviewTags(episodeId);

  return { success: true };
}
