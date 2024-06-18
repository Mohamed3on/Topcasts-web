import { EpisodeForCard } from '@/app/episodes/EpisodeCard';
import EpisodesList from '@/app/episodes/List';
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

export default async function Search({
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
          {searchParams?.podcast_name ? (
            <>
              The top{' '}
              <span className="text-primary/70">
                {searchParams.podcast_name}
              </span>{' '}
              episodes, ranked by Topcasts
            </>
          ) : searchParams?.q ? (
            <>
              Search results for:{' '}
              <span className="text-primary/70">{searchParams.q}</span>
            </>
          ) : null}
        </h1>

        <EpisodesList
          episodes={episodes as EpisodeForCard[]}
          hasNextPage={hasNextPage}
        />
      </div>
    </div>
  );
}
