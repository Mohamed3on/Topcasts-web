import { SpotifyButton } from '@/app/ListenButton';
import { EpisodeDetails } from '@/app/api/episode/route';
import React from 'react';
import Image from 'next/image';

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

export const PodcastDetails = ({
  episodeDetails,
  email,
}: {
  episodeDetails: EpisodeDetails;
  email?: string;
}) => {
  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
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
          Only <strong>{email}</strong> holds the magic key to this kingdom!
        </p>
        <p className='text-center'>{episodeDetails.description}</p>

        <div className='flex flex-col gap-4 items-center'>
          {episodeDetails.duration && (
            <p className='text-lg'>{formatDuration(episodeDetails.duration)}</p>
          )}

          {episodeDetails.formattedDuration && (
            <p className='text-lg'>{episodeDetails.formattedDuration}</p>
          )}
          <p>{JSON.stringify(episodeDetails)}</p>

          {
            <div className='flex gap-4 justify-center items-center flex-col'>
              <span className='text-lg font-semibold'>Listen on:</span>
              {<SpotifyButton episodeDetails={episodeDetails} />}
              {<a href={episodeDetails.applePodcastsURL}>Apple Podcasts</a>}
            </div>
          }
        </div>
      </div>
    </main>
  );
};
