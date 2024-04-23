'use client';
import { PlayerIcon } from '@/app/PlayerIcon';
import { EpisodeDetails } from './api/types';
import React from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import AppleIcon from '@/components/AppleIcon';

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
export const PodcastDetails = () => {
  const [episodeDetails, setEpisodeDetails] = React.useState<EpisodeDetails | null>(null);

  const [episodeURL, setEpisodeURL] = React.useState<string>('');
  return (
    <main className='flex min-h-screen flex-col items-center justify-between px-24 py-12'>
      <div className='flex items-center gap-8 w-full pb-8'>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const response = await fetch(`/api/episode`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: episodeURL }),
            });
            const episodeDetails = await response.json();
            setEpisodeDetails(episodeDetails);
          }}
          className='relative h-10 w-full'
        >
          <Input
            className='pl-10 pr-3 py-2 text-md w-full border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6E23DD] focus:border-transparent'
            value={episodeURL}
            placeholder='enter a podcast episode URL'
            onChange={(e) => {
              setEpisodeURL(e.target.value);
            }}
          ></Input>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10' />
        </form>

        <Button type='submit'>Get Episode Details</Button>
      </div>
      {episodeDetails && (
        <div className='flex flex-col gap-8 items-center justify-center'>
          <h1 className='text-3xl font-semibold text-center'>{episodeDetails.episode_name}</h1>
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
            {/* <p>{JSON.stringify(episodeDetails)}</p> */}
            <Duration episodeDetails={episodeDetails} />
            {
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
            }
          </div>
          <p className=''>
            <span>{episodeDetails?.description}</span>
          </p>
        </div>
      )}
    </main>
  );
};
