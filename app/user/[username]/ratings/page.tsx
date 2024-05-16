import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodeDetailsForList } from '@/app/episodes/page';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

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

const Page = async ({ params }: { params: { username: string } }) => {
  const supabase = createClient();

  const { data: userData } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('username', params.username)
    .single();

  if (!userData) {
    notFound();
  }

  const name = userData.name;

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
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        {name}&rsquo;s Rated Episodes
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(mappedEpisodes as unknown as EpisodeDetailsForList).map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
};

export default Page;
