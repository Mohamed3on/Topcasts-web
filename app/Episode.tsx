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
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[auto,1fr] md:gap-12">
        <div className="flex flex-col items-center gap-6">
          {episodeDetails.image_url && (
            <Image
              width={300}
              height={300}
              className="h-64 w-64 rounded-xl object-cover shadow-lg"
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
            <div className="flex items-center gap-1.5 text-blue-500">
              <Twitter className="h-5 w-5" />
              <span className="text-sm">
                {episodeDetails.twitter_shares} Recommendations
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <h1 className="text-center text-2xl font-semibold md:text-left">
            {episodeDetails.episode_name}
          </h1>
          <Link
            prefetch={true}
            href={`/podcast/${episodeDetails.podcast_id}`}
            className="text-lg text-primary/80 underline transition-all hover:text-primary/60 hover:no-underline active:text-primary/40"
          >
            {episodeDetails.podcast_name}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {episodeDetails.date_published && (
              <span>
                {new Date(episodeDetails.date_published).toLocaleDateString(
                  'en-gb',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  },
                )}
              </span>
            )}
            {episodeDetails.date_published &&
              (episodeDetails.duration || episodeDetails.formatted_duration) && (
                <span className="text-muted-foreground/40">&middot;</span>
              )}
            <Duration episodeDetails={episodeDetails} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-sm font-medium text-muted-foreground">Listen on</span>
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
            <div className="prose w-full pt-2">
              <EpisodeDescription description={episodeDetails.description} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
