import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodeDetailsForList } from '@/app/episodes/page';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

const fetchUserEpisodes = async (id: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('episodes_with_rating_data')
    .select(
      `*,
  episode_reviews!inner(review_type, user_id)
  `,
    )
    .eq('episode_reviews.user_id', id);

  if (error || !data) {
    console.error('Error fetching user ratings:', error);
    return null;
  }

  return data;
};

const Page = async ({ params }: { params: { id: string } }) => {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  const name = userData?.user?.user_metadata?.full_name;
  const { id } = params;

  const userEpisodes = await fetchUserEpisodes(id);

  if (!userEpisodes) {
    notFound();
  }

  let mappedEpisodes = userEpisodes
    .map((episode) => {
      const { episode_reviews, ...rest } = episode;

      return {
        ...rest,
        review_type: episode_reviews[0]?.review_type,
      };
    })
    .sort(
      (a, b) =>
        // Sort by review type, with likes first
        Number(b.review_type === 'like') - Number(a.review_type === 'like'),
    );

  return (
    <div className="container pb-24">
      <h1 className="mb-8 mt-6 grid place-items-center text-2xl font-semibold ">
        {name}&rsquo;s Rated Episodes
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(mappedEpisodes as EpisodeDetailsForList).map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
};

export default Page;
