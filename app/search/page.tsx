import { EpisodeForCard } from '@/app/episodes/EpisodeCard';
import EpisodesList from '@/app/episodes/List';
import { createClient } from '@/utils/supabase/ssr';

const fetchEpisodes = async ({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string;
  }>;
}) => {
  const { page, q, episode_name, podcast_name } = (await searchParams) || {};

  // TODO: use cursor pagination instead of offset
  const pageIndex = page ? parseInt(page) : 1;
  const pageSize = 30;

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .rpc('search_episodes_by_relevance', {
      search_query: q?.replace(/ /g, '+') || '',
      current_user_id: userId,
      search_episode_name: episode_name || '',
      search_podcast_name: podcast_name || '',
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
  searchParams?: Promise<{
    [key: string]: string;
  }>;
}) {
  const { q, episode_name, podcast_name } = (await searchParams) || {};
  const { data: episodes, hasNextPage } = await fetchEpisodes({
    searchParams: searchParams || undefined,
  });
  return (
    <div className="container flex flex-col gap-8 pb-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="mt-6 text-center text-2xl font-semibold">
          {podcast_name ? (
            <>
              The top <span className="text-primary/70">{podcast_name}</span>{' '}
              episodes, ranked by Topcasts
            </>
          ) : q ? (
            <>
              Search results for: <span className="text-primary/70">{q}</span>
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
