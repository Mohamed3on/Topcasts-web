import { PlayerIcon } from '@/app/PlayerIcon';
import { ReviewSection } from '@/app/ReviewSection';
import { EpisodeDescription } from '@/app/episodes/EpisodeDescription';
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

export const PodcastDetails = ({
  episodeDetails,
}: {
  episodeDetails: EpisodeDetails;
}) => {
  return (
    <main className="flex flex-col items-center justify-between p-4 md:p-12">
      <div className="flex w-full flex-col items-center justify-center gap-8">
        {process.env.NODE_ENV === 'development' ? (
          <div className="flex w-full justify-between">
            <Button asChild variant={'link'}>
              <Link
                href={`${getHost()}/episode/${episodeDetails.id - 1}`}
                className="flex gap-1"
              >
                <ArrowLeft></ArrowLeft>
                {'Previous Episode'}
              </Link>
            </Button>
            <Button asChild variant={'link'}>
              <Link
                href={`${getHost()}/episode/${episodeDetails.id + 1}`}
                className="flex gap-1"
              >
                {'Next Episode'}
                <ArrowLeft className="rotate-180 transform"></ArrowLeft>
              </Link>
            </Button>
          </div>
        ) : null}
        <h1 className="text-center text-2xl font-semibold">
          {episodeDetails.episode_name}
        </h1>
        {episodeDetails.image_url && (
          <Image
            width={300}
            height={300}
            unoptimized
            className="h-64 w-64 rounded-lg object-cover"
            src={episodeDetails.image_url}
            alt={episodeDetails.episode_name}
          />
        )}
        <Link
          href={`/episodes?q="${episodeDetails.podcast_name}"`}
          className="text-2xl font-bold text-primary/60 underline transition-all hover:text-primary/80 hover:no-underline"
        >
          {episodeDetails.podcast_name}
        </Link>
        <div className="flex flex-col items-center gap-4">
          {episodeDetails.date_published && (
            <p className="text-gray-500">
              {new Date(episodeDetails.date_published).toLocaleDateString(
                'en-gb',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                },
              )}
            </p>
          )}
          <Duration episodeDetails={episodeDetails} />
          <ReviewSection episodeId={episodeDetails.id} />
          <div className="flex items-center justify-center gap-4">
            <span className="text-lg font-semibold">Listen on:</span>
            {episodeDetails.urls?.spotify && (
              <PlayerIcon url={episodeDetails.urls.spotify}>
                <SpotifyIcon />
              </PlayerIcon>
            )}
            {episodeDetails.podcast_itunes_id && (
              <PlayerIcon
                url={
                  episodeDetails.urls?.apple ||
                  `https://podcasts.apple.com/us/podcast/id${episodeDetails.podcast_itunes_id}`
                }
              >
                <AppleIcon></AppleIcon>
              </PlayerIcon>
            )}
            {episodeDetails.urls?.castro && (
              <PlayerIcon url={episodeDetails.urls.castro}>
                <img
                  src="https://castro.fm/assets/images/Bitmap.svg"
                  alt="Castro"
                ></img>
              </PlayerIcon>
            )}
          </div>
        </div>

        {episodeDetails.description && (
          <div className="prose w-full">
            <EpisodeDescription description={episodeDetails.description} />
          </div>
        )}
      </div>
    </main>
  );
};
