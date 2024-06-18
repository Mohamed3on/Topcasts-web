import { EpisodeForCard } from '@/app/episodes/EpisodeCard';
import EpisodesList from '@/app/episodes/List';
import { createClient } from '@/utils/supabase/ssr';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Episodes',
  description: 'Discover the best podcast episodes on the internet.',
};

const fetchEpisodes = async ({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) => {
  // TODO: use cursor pagination instead of offset
  const pageIndex = searchParams?.page ? parseInt(searchParams.page) : 1;
  const pageSize = 30;

  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  const userId = userData?.user?.id;

  if (userId) {
    const { data, error } = await supabase
      .from('episode_with_rating_data')
      .select(
        `
        id,
        slug,
        episode_name,
        image_url,
        podcast_name,
        description,
        twitter_shares,
        likes,
        dislikes,
      podcast_episode_review(review_type, user_id, episode_id)`,
      )
      .eq('podcast_episode_review.user_id', userId)
      .order('popularity_score', { ascending: false })

      .range((pageIndex - 1) * pageSize, pageIndex * pageSize - 1);

    if (error) {
      throw error;
    }

    const episodes = data?.map((episode) => {
      return {
        ...episode,
        review_type: episode?.podcast_episode_review?.[0]?.review_type || null,
      };
    });

    return { data: episodes, hasNextPage: data.length === pageSize };
  } else {
    const { data, error } = await supabase
      .from('episode_with_rating_data')
      .select(
        `id,
      slug,
      episode_name,
      image_url,
      podcast_name,
      description,
      twitter_shares,
      likes,
      dislikes`,
      )
      .order('popularity_score', { ascending: false })
      .range((pageIndex - 1) * pageSize, pageIndex * pageSize - 1);

    if (error) {
      throw error;
    }

    return { data, hasNextPage: data.length === pageSize };
  }
};

export default async function Episodes({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) {
  const { data: episodes, hasNextPage } = await fetchEpisodes({ searchParams });
  return (
    <div className="container flex flex-col gap-8 pb-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="mt-6 text-center text-2xl font-semibold">
          Browse the best podcast episodes, curated by people like you
        </h1>
        <EpisodesList
          episodes={episodes as EpisodeForCard[]}
          hasNextPage={hasNextPage}
        />
      </div>
    </div>
  );
}
