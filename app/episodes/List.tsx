import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { createClient } from '@/utils/supabase/server';
import { Fragment } from 'react';

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

  const { data, error } = await supabase
    .rpc('search_episodes_by_relevance', {
      search_query: searchParams?.q?.replace(/ /g, '+') || '',
      current_user_id: userId,
    })
    .range((pageIndex - 1) * pageSize, pageIndex * pageSize - 1);

  if (error) {
    throw error;
  }

  return data;
};

export type EpisodeDetailsForList = Awaited<ReturnType<typeof fetchEpisodes>>;

export default async function EpisodesList({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) {
  const episodes = await fetchEpisodes({ searchParams });

  return (
    <Fragment>
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </Fragment>
  );
}
