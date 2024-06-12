import { Database } from '@/app/api/types/supabase';
import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

export type EpisodeForCard =
  Database['public']['Tables']['podcast_episode']['Row'] & {
    review_type?: string;
    review_text?: string;
    podcast_name: string;
    twitter_shares: number;
    likes: number;
    dislikes: number;
  };
const fetchUserEpisodes = async (id: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('podcast_episode_review')
    .select(
      `
    review_type,
    text,
    user_id,
    updated_at,
    episode_with_rating_data(
      id,
      slug,
      episode_name,
      image_url,
      podcast_name,
      description,
      twitter_shares,
      likes,
      dislikes
    )
  `,
    )
    .eq('user_id', id)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error('Error fetching user ratings:', error);
    return [];
  }

  return data;
};

const EpisodeGrid = async ({ username }: { username: string }) => {
  const supabase = createClient();

  const { data: userData } = await supabase
    .from('profiles')
    .select('id, name,avatar_url')
    .eq('username', username)
    .single();

  if (!userData) {
    notFound();
  }

  const userEpisodes = await fetchUserEpisodes(userData.id);

  if (!userEpisodes?.length) {
    notFound();
  }

  let mappedEpisodes = userEpisodes.map((episode) => {
    return {
      ...episode.episode_with_rating_data,
      review_type: episode.review_type,
      review_text: episode.text,
    };
  });

  return (
    <Fragment>
      {mappedEpisodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode as EpisodeForCard}>
          {episode.review_text && (
            <div className="mt-3 flex items-end gap-2">
              {userData?.avatar_url && (
                <Image
                  width={24}
                  height={24}
                  className="rounded-full"
                  src={userData?.avatar_url}
                  alt="User Image"
                />
              )}

              <span className="prose mt-3 line-clamp-1 text-sm text-primary sm:line-clamp-2">
                {episode.review_text}
              </span>
            </div>
          )}
        </EpisodeCard>
      ))}
    </Fragment>
  );
};

export default EpisodeGrid;
