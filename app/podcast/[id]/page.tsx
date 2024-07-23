import { PlayerIcon } from '@/app/PlayerIcon';
import PodcastEpisodes from '@/app/podcast/[id]/PodcastEpisodes';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';
import { Suspense } from 'react';
import YouAndPodcast from '@/app/components/YouAndPodcast';
import Link from 'next/link';

export default async function PodcastPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = createClient();
  const { data: podcast, error } = await supabase
    .from('podcast')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    console.log('🚀 ~ error:', error);
    return <div>Error loading podcast details</div>;
  }

  if (!podcast) {
    return <div>Podcast not found</div>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <div className="flex flex-col items-center md:w-1/3">
          <Image
            width={224}
            height={224}
            src={podcast.image_url || ''}
            alt={podcast.name}
            objectFit="cover"
            className="mb-4 rounded-lg shadow-lg"
          />
        </div>

        <div className="flex w-full flex-col items-center gap-4 text-center md:w-2/3 md:items-start md:text-left">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h1 className="text-3xl font-bold">{podcast.name}</h1>
            <p className="text-gray-600">{podcast.artist_name}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {podcast.genres &&
              podcast.genres.map((genre, index) => (
                <Link
                  key={index}
                  href={`/genre/${genre}`}
                  className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700"
                >
                  {genre}
                </Link>
              ))}
          </div>
          <div className="flex w-full flex-col md:flex-row md:justify-between">
            <div className="flex flex-col items-center gap-2 md:w-1/2 md:items-start">
              <h2 className="text-xl font-semibold">Listen on:</h2>
              <div className="flex w-full flex-wrap justify-center gap-2 md:justify-start">
                {podcast.itunes_id && (
                  <PlayerIcon
                    url={`https://podcasts.apple.com/podcast/id${podcast.itunes_id}`}
                  >
                    <AppleIcon />
                  </PlayerIcon>
                )}
                {podcast.spotify_id && (
                  <PlayerIcon
                    url={`https://open.spotify.com/show/${podcast.spotify_id}`}
                  >
                    <SpotifyIcon />
                  </PlayerIcon>
                )}
              </div>
            </div>
          </div>
        </div>
        {user && (
          <div>
            <Suspense
              fallback={<Skeleton className="h-24 w-full animate-pulse" />}
            >
              <YouAndPodcast
                userId={user.id}
                podcastId={podcast.id}
                podcastName={podcast.name}
              />
            </Suspense>
          </div>
        )}
      </div>

      <Separator className="my-4 w-full" />
      <Suspense fallback={<Skeleton className="h-48 w-full animate-pulse" />}>
        <PodcastEpisodes
          podcastId={podcast.id}
          page={Number(searchParams.page) || 1}
        />
      </Suspense>
    </div>
  );
}
