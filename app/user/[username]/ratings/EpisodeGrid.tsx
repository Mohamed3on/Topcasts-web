import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodeDetailsForList } from '@/app/episodes/List';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

const fetchUserEpisodes = async (id: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('podcast_episode_review')
    .select(
      `
    review_type,
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
    return {
      ...episode.episode_with_rating_data,
      review_type: episode.review_type,
    };
  });
  return (
    <Fragment>
      {(mappedEpisodes as unknown as EpisodeDetailsForList).map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </Fragment>
  );
};

export default EpisodeGrid;
