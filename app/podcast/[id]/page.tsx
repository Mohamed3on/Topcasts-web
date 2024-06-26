import { PlayerIcon } from '@/app/PlayerIcon';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { createClient } from '@/utils/supabase/ssr';
import Image from 'next/image';

export default async function PodcastPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('podcast')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    console.log('🚀 ~ error:', error);
    return <div>Error loading podcast details</div>;
  }

  if (!data) {
    return <div>Podcast not found</div>;
  }

  const podcast = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8 ">
        <Image
          width={224}
          height={224}
          src={podcast.image_url || ''}
          alt={podcast.name}
          objectFit="cover"
          className="rounded-lg shadow-lg"
        />

        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h1 className="text-3xl font-bold">{podcast.name}</h1>
            <p className="text-gray-600">{podcast.artist_name}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {podcast.genres &&
              podcast.genres.map((genre, index) => (
                <span
                  key={index}
                  className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700"
                >
                  {genre}
                </span>
              ))}
          </div>
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h2 className="text-xl font-semibold">Listen on:</h2>
            <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
