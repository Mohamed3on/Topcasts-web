import { PlayerIcon } from '@/app/PlayerIcon';
import { ReviewSection } from '@/app/ReviewSection';
import { EpisodeDescription } from '@/app/episodes/EpisodeDescription';
import AppleIcon from '@/components/AppleIcon';
import { SpotifyIcon } from '@/components/SpotifyIcon';
import { Twitter } from 'lucide-react';
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

export const Episode = ({
  episodeDetails,
}: {
  episodeDetails: EpisodeDetails;
}) => {
  return (
    <main className="flex flex-col items-center p-4 md:p-12">
      <div className="grid w-full gap-8 md:grid-cols-[1fr,2fr]">
        <div className="flex flex-col items-center gap-8">
          {episodeDetails.image_url && (
            <Image
              width={300}
              height={300}
              className="h-64 w-64 rounded-lg object-cover"
              src={episodeDetails.image_url}
              alt={episodeDetails.episode_name!}
            />
          )}
          <ReviewSection
            episodeId={episodeDetails.id!}
            likes={episodeDetails.likes || 0}
            dislikes={episodeDetails.dislikes || 0}
          />
          {episodeDetails.twitter_shares! > 0 && (
            <div className="flex items-center gap-1 text-blue-500">
              <Twitter className="h-6 w-6" />
              <span className="">
                {episodeDetails.twitter_shares} Recommendations
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 md:items-start ">
          <h1 className="text-center text-2xl font-semibold md:text-left">
            {episodeDetails.episode_name}
          </h1>
          <Link
            href={`/episodes?podcast_name=${episodeDetails.podcast_name}`}
            className="text-xl  text-primary/80 underline transition-all hover:text-primary/60 hover:no-underline active:text-primary/40"
          >
            {episodeDetails.podcast_name}
          </Link>
          {episodeDetails.date_published && (
            <p className="text-muted-foreground">
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

          <div className="flex gap-4">
            <span className="text-lg font-semibold">Listen on:</span>
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
            {episodeDetails.podcast_spotify_id && (
              <PlayerIcon
                url={
                  episodeDetails.urls?.spotify ||
                  `https://open.spotify.com/show/${episodeDetails.podcast_spotify_id}`
                }
              >
                <SpotifyIcon />
              </PlayerIcon>
            )}
            {episodeDetails.urls?.castro && (
              <PlayerIcon url={episodeDetails.urls.castro}>
                <Image
                  src="/castro.jpg"
                  width={32}
                  height={32}
                  className="rounded"
                  alt="Castro"
                ></Image>
              </PlayerIcon>
            )}
          </div>

          {episodeDetails.description && (
            <div className="prose w-full">
              <EpisodeDescription description={episodeDetails.description} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
