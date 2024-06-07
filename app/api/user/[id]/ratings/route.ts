import { createClient } from '@/utils/supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// TODO:figure out why this doesn't work. later
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('episode_with_rating_data')
    .select(
      `
    *,
    podcast_episode_review!inner(review_type, user_id, episode_id)
    `,
    )
    .eq('podcast_episode_review.user_id', 0);

  if (error || !data) {
    console.error('Error fetching user ratings:', error);
    return NextResponse.json(
      { error: `Failed to fetch user ratings: ${error?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
