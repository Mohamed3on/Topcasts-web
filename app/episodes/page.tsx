import EpisodesList from '@/app/episodes/List';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Episodes',
  description: 'Discover the best podcast episodes on the internet.',
};

const fetchEpisodes = async ({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) => {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();

  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .rpc('search_episodes', {
      search_query: searchParams?.q?.replace(/ /g, '+') || '',
      current_user_id: userId,
    })
    .limit(30);

  if (error) {
    throw error;
  }

  return data;
};

export type EpisodeDetailsForList = Awaited<ReturnType<typeof fetchEpisodes>>;

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
