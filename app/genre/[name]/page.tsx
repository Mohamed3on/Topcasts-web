import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, Twitter } from 'lucide-react';
import { Database } from '@/app/api/types/supabase';

type TopEpisode =
  Database['public']['Functions']['get_top_episodes_by_genre']['Returns'][number];

export default async function GenrePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const supabase = await createClient();

  const capitalizedName = decodeURIComponent(name)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const { data: episodes, error } = await supabase.rpc(
    'get_top_episodes_by_genre',
    { genre_param: decodeURIComponent(name) },
  );

  if (error) {
    console.error('Error fetching podcasts:', error);
    return <div>Error loading podcasts</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold text-gray-800">
        Top <span className="text-primary">{capitalizedName}</span> Podcast
        Episodes
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {episodes.map((episode, index) => (
          <Link
            href={`/episode/${episode.episode_id}`}
            key={episode.episode_id}
            className="group"
          >
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg border bg-white transition-shadow duration-200 hover:shadow-md">
              <div className="absolute left-0 top-0 z-10 rounded-br bg-primary px-2 py-1 text-sm font-bold text-white">
                #{index + 1}
              </div>
              <div className="flex grow flex-col p-4">
                <div className="relative mb-4 aspect-square">
                  <Image
                    width={224}
                    height={224}
                    src={episode.image_url}
                    alt={episode.episode_name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="rounded-md object-cover"
                  />
                </div>
                <h2 className="mb-1 line-clamp-3 text-lg font-semibold text-gray-700">
                  {episode.episode_name}
                </h2>
                <p className="mb-4 truncate text-sm text-gray-500">
                  {episode.podcast_name}
                </p>
                <div className="mt-auto flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-green-600">
                      <ThumbsUp className="mr-1 h-4 w-4" />
                      <span>{episode.likes}</span>
                    </div>
                    <div className="flex items-center text-red-600">
                      <ThumbsDown className="mr-1 h-4 w-4" />
                      <span>{episode.dislikes}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sky-500">
                    <Twitter className="mr-1 h-4 w-4" />
                    <span>{episode.twitter_shares}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
