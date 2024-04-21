'use client';
import { SpotifyButton } from '@/app/ListenButton';
import { EpisodeDetails } from '@/app/api/episode/route';
import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardPasteIcon, Copy, Search } from 'lucide-react';

const formatDuration = (duration: string) => {
  const totalSeconds = parseInt(duration) / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  let formattedDuration = '';
  if (hours > 0) {
    formattedDuration = `${hours} hours ${minutes} minutes`;
  } else if (minutes > 0) {
    formattedDuration = `${minutes} minutes`;
  } else {
    formattedDuration = `${seconds} seconds`;
  }
  return formattedDuration;
};

const Duration = ({ episodeDetails }: { episodeDetails: EpisodeDetails }) => {
  return (
    // format the duration of the episode if exists, otherwise use formattedDuration, otherwise return
    // null
    <span>
      {episodeDetails.duration
        ? formatDuration(episodeDetails.duration)
        : episodeDetails.formattedDuration
        ? episodeDetails.formattedDuration
        : null}
    </span>
  );
};
export const PodcastDetails = () => {
  const [episodeDetails, setEpisodeDetails] = React.useState<EpisodeDetails | null>(null);
  const { user } = useAuth();

  const [episodeURL, setEpisodeURL] = React.useState<string>('');

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div className='flex items-center gap-8 w-full pb-8'>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const response = await fetch(`/api/episode?url=${episodeURL}`);
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
          <h1 className='text-4xl font-bold text-center'>{episodeDetails.episodeName}</h1>
          {episodeDetails.imageUrl && (
            <Image
              width={300}
              height={300}
              unoptimized
              className='w-64 h-64 object-cover rounded-lg'
              src={episodeDetails.imageUrl}
              alt={episodeDetails.episodeName}
            />
          )}
          <p className='text-2xl font-bold'>{episodeDetails.podcastName}</p>
          <p>
            Only <strong>{user?.displayName}</strong> holds the magic key to this kingdom!
          </p>
          <p className='text-center'>{episodeDetails.description}</p>

          <div className='flex flex-col gap-4 items-center'>
            {/* <p>{JSON.stringify(episodeDetails)}</p> */}
            <Duration episodeDetails={episodeDetails} />
            {
              <div className='flex gap-4 justify-center items-center'>
                <span className='text-lg font-semibold'>Listen on:</span>
                {episodeDetails.spotifyURL && (
                  <SpotifyButton spotifyURL={episodeDetails.spotifyURL} />
                )}
                {episodeDetails.applePodcastsURL && (
                  <a href={episodeDetails.applePodcastsURL}>Apple Podcasts</a>
                )}
              </div>
            }
          </div>
        </div>
      )}
    </main>
  );
};
