import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

const fetchUserEpisodes = async (id: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('episode_with_rating_data')
    .select(
      `*,
    podcast_episode_review!inner(review_type, user_id,created_at, updated_at)
    `,
    )
    .eq('podcast_episode_review.user_id', id)
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
    .select('id, name')
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
    const { podcast_episode_review, ...rest } = episode;
    return {
      ...rest,
      review_type: podcast_episode_review[0]?.review_type,
    };
  });
  return (
    <Fragment>
      {mappedEpisodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </Fragment>
  );
};

export default EpisodeGrid;
