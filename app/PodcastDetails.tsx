import { PlayerIcon } from '@/app/PlayerIcon';
import { ReviewSection } from '@/app/ReviewSection';
import { getHost } from '@/app/utils';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EpisodeDetails } from './api/types';

const formatDuration = (duration: number) => {
  const totalSeconds = duration / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let formatted_duration = '';
  if (hours > 0) {
    formatted_duration = `${hours} hours ${minutes} minutes`;
  } else if (minutes > 0) {
    formatted_duration = `${minutes} minutes`;
  } else {
    formatted_duration = `${seconds} seconds`;
  }
  return formatted_duration;
};

const Duration = ({ episodeDetails }: { episodeDetails: EpisodeDetails }) => {
  return (
    <span>
      {episodeDetails.duration
        ? formatDuration(episodeDetails.duration)
        : episodeDetails.formatted_duration
        ? episodeDetails.formatted_duration
        : null}
    </span>
  );
};

export const PodcastDetails = ({ episodeDetails }: { episodeDetails: EpisodeDetails | null }) => {
  return (
    <main className='flex min-h-screen flex-col items-center justify-between px-24 py-12'>
      {episodeDetails && (
        <div className='flex flex-col gap-8 items-center justify-center'>
          <div className='flex justify-between w-full'>
            <Button asChild variant={'link'}>
              <Link
                href={`${getHost()}/episode/${episodeDetails.id - 1}`}
                className='flex gap-1 no-underline'
              >
                <ArrowLeft></ArrowLeft>
                {'Previous Episode'}
              </Link>
            </Button>
            <Button asChild variant={'link'}>
              <Link
                href={`${getHost()}/episode/${episodeDetails.id + 1}`}
                className='flex gap-1 no-underline'
              >
                {'Next Episode'}
                <ArrowLeft className='transform rotate-180'></ArrowLeft>
              </Link>
            </Button>
          </div>
          <h1 className='text-2xl font-semibold text-center'>{episodeDetails.episode_name}</h1>
          {episodeDetails.image_url && (
            <Image
              width={300}
              height={300}
              unoptimized
              className='w-64 h-64 object-cover rounded-lg'
              src={episodeDetails.image_url}
              alt={episodeDetails.episode_name}
            />
          )}
          <p className='text-2xl font-bold'>{episodeDetails.podcast_name}</p>
          <div className='flex flex-col gap-4 items-center'>
            {episodeDetails.date_published && (
              <p className='text-gray-500'>
                {new Date(episodeDetails.date_published).toLocaleDateString('en-gb', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
            {/* <p>{JSON.stringify(episodeDetails)}</p> */}
            <Duration episodeDetails={episodeDetails} />
            <ReviewSection episodeId={episodeDetails.id} />
            <div className='flex gap-4 justify-center items-center'>
              <span className='text-lg font-semibold'>Listen on:</span>
              {episodeDetails.urls?.spotify && (
                <PlayerIcon url={episodeDetails.urls.spotify}>
                  <SpotifyIcon />
                </PlayerIcon>
              )}
              {episodeDetails.urls?.apple && (
                <PlayerIcon url={episodeDetails.urls.apple}>
                  <AppleIcon></AppleIcon>
                </PlayerIcon>
              )}
            </div>
          </div>
          <p className=''>
            <span>{episodeDetails?.description}</span>
          </p>
        </div>
      )}
    </main>
  );
};
