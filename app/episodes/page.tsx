import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

const fetchEpisodes = async ({
  searchParams,
}: {
  searchParams?: {
    [key: string]: string;
  };
}) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookies() as CookieOptions,
    }
  );

  if (searchParams?.q) {
    const { data, error } = await supabase.rpc('search_episodes_by_terms', {
      search_query: searchParams.q.replace(/ /g, '+'),
    });

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase.from('episode_details').select('*').order('id');

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

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='grid gap-4 '>
        {episodes.map((episode: any) => (
          <Link
            href={`/episode/${episode.id}/${episode.slug}`}
            key={episode.id}
            className='flex flex-col md:flex-row items-center border rounded-lg text-center md:text-left hover:shadow-md transition duration-100 ease-in-out hover:underline overflow-hidden'
          >
            <img
              src={episode.image_url}
              alt={episode.episode_name}
              className='w-52 md:w-40 object-cover rounded'
            />
            <div className='grid p-4'>
              <h2 className='text-lg font-bold mb-1'>{episode.episode_name}</h2>
              <p className='text-gray-600 font-semibold'>{episode.podcast_name}</p>
              <p className='text-gray-500 text-sm truncate mt-2'>{episode.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
