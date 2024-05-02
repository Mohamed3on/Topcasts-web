import EpisodesList from '@/app/episodes/List';
import { createClient } from '@/utils/supabase/server';

const fetchEpisodes = async ({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) => {
  const supabase = createClient();

  if (searchParams?.q) {
    const { data, error } = await supabase.rpc('search_episodes_by_terms', {
      search_query: searchParams.q.replace(/ /g, '+'),
    });

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.from('episode_details').select('*').order('podcast_name');

  if (error) {
    throw error;
  }

  return data;
};
export default async function Episodes({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) {
  const episodes = await fetchEpisodes({ searchParams });

  return <EpisodesList episodes={episodes} />;
}
