import { EpisodeCard } from '@/app/episodes/EpisodeCard';
import { EpisodePagination } from '@/app/episodes/EpisodesPagination';
import { createClient } from '@/utils/supabase/ssr';

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
      search_episode_name: searchParams?.episode_name || '',
      search_podcast_name: searchParams?.podcast_name || '',
    })
    .range((pageIndex - 1) * pageSize, pageIndex * pageSize - 1);

  if (error) {
    throw error;
  }

  return { data, hasNextPage: data.length === pageSize };
};

export type EpisodeDetailsForList = Awaited<
  ReturnType<typeof fetchEpisodes>
>['data'];

export default async function EpisodesList({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) {
  const { data: episodes, hasNextPage } = await fetchEpisodes({ searchParams });

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="mt-6 text-center text-2xl font-semibold">
        Browse the best
        <span className=" italic text-primary/70">
          {`
        ${searchParams?.podcast_name ? `${searchParams?.podcast_name}` : 'podcast'}
        `}
        </span>
        episodes, curated by people like you
      </h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
      <EpisodePagination hasNextPage={hasNextPage} />
    </div>
  );
}
